from __future__ import annotations

import json
import os
from uuid import UUID

import google.generativeai as genai
import typing_extensions as typing
from litestar import Controller, post
from litestar.connection import ASGIConnection
from litestar.exceptions import HTTPException
from pydantic import BaseModel, Field

from src.entrypoint.ai.schemas import ChatRequest, ChatResponse
from src.entrypoint.config import Settings
from src.idp import IDPFacade
from src.scrum import ScrumFacade
from src.scrum.ports.proyecto_repository import ProyectoRepository


class ActionSchema(BaseModel):
    type: str = Field(
        description="Tipo de acción: 'create_sprint', 'create_story', 'add_task', 'update_sprint', 'update_story', o 'none'"
    )
    params: dict = Field(default_factory=dict, description="Parámetros requeridos para la acción")


class GeminiResponseSchema(BaseModel):
    response: str = Field(description="Respuesta conversacional para el usuario")
    action: ActionSchema = Field(description="Acción estructurada para el sistema")


class AIChatController(Controller):
    path = ""

    @post("/chat")
    async def ai_chat(
        self,
        data: ChatRequest,
        proyecto_repo: ProyectoRepository,
        request: ASGIConnection,
        settings: Settings,
    ) -> ChatResponse:
        # Leer API key desde las configuraciones inyectadas de la app
        api_key = settings.gemini_api_key
        if not api_key:
            raise HTTPException(
                status_code=400,
                detail="La clave de API de Gemini (GEMINI_API_KEY) no está configurada en el servidor backend.",
            )

        user: dict | None = request.user
        if not user:
            raise HTTPException(status_code=401, detail="Usuario no autenticado.")

        # Construir contexto del proyecto via ScrumFacade (sin tocar entidades de dominio)
        context = "No hay ningún proyecto seleccionado actualmente.\n"
        proyecto_dict: dict | None = None

        if data.project_id:
            scrum = ScrumFacade(proyecto_repo)
            try:
                proyecto_dict = await scrum.get_proyecto(data.project_id)
                if proyecto_dict:
                    is_admin = IDPFacade.is_admin(user)
                    is_member = user["id"] in proyecto_dict["miembros"]
                    if not is_admin and not is_member:
                        raise HTTPException(
                            status_code=403,
                            detail="No tienes permisos para acceder o interactuar con este proyecto.",
                        )

                    context = "PROYECTO ACTUAL:\n"
                    context += f"- ID: {proyecto_dict['id']}\n"
                    context += f"- Nombre: {proyecto_dict['nombre']}\n"
                    context += f"- Descripción: {proyecto_dict['descripcion']}\n"

                    context += "\nHISTORIAS DE USUARIO EN EL BACKLOG:\n"
                    if not proyecto_dict["historias"]:
                        context += "  (No hay historias de usuario registradas)\n"
                    for i, h in enumerate(proyecto_dict["historias"]):
                        context += (
                            f"  - [HU-{i+1}] ID: {h['id']} | Título: {h['titulo']} "
                            f"| SP: {h['story_points']} | Estado: {h['status']}\n"
                        )
                        if h.get("descripcion"):
                            context += f"    Descripción: {h['descripcion']}\n"

                    context += "\nSPRINTS:\n"
                    if not proyecto_dict["sprints"]:
                        context += "  (No hay sprints planificados)\n"
                    for s in proyecto_dict["sprints"]:
                        context += (
                            f"  - ID: {s['id']} | Nombre: {s['nombre']} "
                            f"| Estado: {s['status']} "
                            f"| Historias asignadas (IDs): {', '.join(s['backlog'])}\n"
                        )
            except HTTPException:
                raise
            except Exception:
                pass  # ID no válido u otro error — continuar sin contexto de proyecto

        context += f"\nINFORMACIÓN DEL USUARIO DE LA SESIÓN:\n"
        context += f"- Nombre: {user.get('name', '')}\n"
        context += f"- Rol: {user.get('role', '')}\n"
        context += f"- ID de Usuario: {user['id']}\n"

        # Configurar y llamar a Gemini
        genai.configure(api_key=api_key)
        system_instruction = (
            "Eres un asistente de IA experto en metodología Scrum integrado en Luma Scrum Manager.\n"
            "Tu objetivo es ayudar al usuario a gestionar su espacio de trabajo y proyectos de forma rápida y autónoma.\n\n"
            "INSTRUCCIONES DE PROACTIVIDAD (CRÍTICAS):\n"
            "1. Sé resolutivo y directo. Si el usuario te pide crear o modificar algo, ejecuta la acción DE INMEDIATO.\n"
            "2. Creación de Sprints: Si no te dan nombre, calcula el siguiente número lógico basándote en el contexto.\n"
            "3. Creación de Historias: Invéntate descripción y SP razonables (2, 3 o 5 según complejidad). NO pidas más detalles.\n"
            "4. Añadir Tareas: Infiere la historia, estima horas lógicas (2-4h) y agrégala directamente.\n"
            "5. ENLACES A HISTORIAS: Siempre que menciones historias en tu respuesta (como 'Agregar login de google' u otras), genera un enlace Markdown usando su UUID con el siguiente formato: `[Nombre de la HU o HU-X](/projects/{proyecto_id}/stories/{story_id})`. Ejemplo: `[Agregar login de google](/projects/proyecto_id/stories/story_id)`. Esto permitirá al usuario hacer clic y acceder directamente a los detalles.\n\n"
            "Acciones disponibles:\n"
            "1. 'create_sprint': parámetros: {'nombre': 'Sprint N'}\n"
            "2. 'create_story': parámetros: {'titulo': '...', 'story_points': 3, 'descripcion': '...'}\n"
            "3. 'add_task': parámetros: {'historia_id': 'UUID', 'titulo': '...', 'estimated_hours': 2, 'descripcion': '...'}\n"
            "4. 'update_sprint': parámetros: {'sprint_id': 'UUID', 'status': 'planned | active | closed'}\n"
            "5. 'update_story': parámetros: {'story_id': 'UUID', 'status': 'pending | in_progress | done'}\n\n"
            "Si no se requiere acción, pon type='none'.\n"
            "Usa siempre los UUIDs reales del contexto.\n"
        )

        gemini_history = []
        if data.history:
            for msg in data.history:
                # If msg is a dict (like in JSON payloads), access via get or brackets
                # If it's a dataclass, it might have attributes. Litestar parses it as dataclass or dict.
                msg_sender = getattr(msg, 'sender', None) or (msg.get('sender') if isinstance(msg, dict) else 'user')
                msg_text = getattr(msg, 'text', None) or (msg.get('text') if isinstance(msg, dict) else '')
                role = "user" if msg_sender == "user" else "model"
                gemini_history.append({
                    "role": role,
                    "parts": [msg_text]
                })

        try:
            model = genai.GenerativeModel(
                model_name="gemini-2.5-flash",
                generation_config={
                    "response_mime_type": "application/json",
                    "response_schema": GeminiResponseSchema,
                },
                system_instruction=system_instruction,
            )
            chat = model.start_chat(history=gemini_history)
            prompt = f"CONTEXTO DEL PROYECTO:\n{context}\n\nMENSAJE DEL USUARIO:\n{data.message}"
            response = chat.send_message(prompt)
            gemini_result = json.loads(response.text)
        except Exception as exc:
            raise HTTPException(
                status_code=500,
                detail=f"Error al comunicarse con la IA de Gemini: {exc}",
            )

        # Parsear respuesta estructurada
        if not isinstance(gemini_result, dict):
            gemini_result = {}

        action = gemini_result.get("action") or {}
        if not isinstance(action, dict):
            action = {}

        action_type = action.get("type", "none")
        params = action.get("params") or {}
        if not isinstance(params, dict):
            params = {}

        ai_response: str = gemini_result.get("response", "Lo siento, no he podido procesar la respuesta.")

        # Ejecutar acción vía ScrumFacade si aplica
        if action_type != "none" and proyecto_dict:
            scrum = ScrumFacade(proyecto_repo)
            pid = proyecto_dict["id"]
            
            is_admin = IDPFacade.is_admin(user)
            project_role = proyecto_dict["miembros"].get(user["id"])
            
            try:
                if action_type == "create_sprint":
                    if not is_admin and project_role not in ["owner", "scrum_master"]:
                        ai_response += "\n\n*[Error: No tienes permisos para crear Sprints. Solo los Scrum Masters, Owners o Administradores pueden hacerlo]*."
                        return ChatResponse(response=ai_response, action_type="none")
                    
                    nombre = params.get("nombre") or params.get("name") or "Sprint"
                    await scrum.create_sprint(pid, nombre)
                    ai_response += f"\n\n*[Acción del Sistema: Se ha creado el sprint '{nombre}']*."

                elif action_type == "create_story":
                    if not is_admin and project_role not in ["owner", "scrum_master", "product_owner"]:
                        ai_response += "\n\n*[Error: No tienes permisos para crear Historias de Usuario. Solo los Product Owners, Scrum Masters, Owners o Administradores pueden hacerlo]*."
                        return ChatResponse(response=ai_response, action_type="none")
                    
                    titulo = params.get("titulo", "")
                    sp_val = int(params.get("story_points", 1))
                    desc = params.get("descripcion", "") or None
                    await scrum.add_historia(pid, titulo, sp_val, desc)
                    ai_response += f"\n\n*[Acción del Sistema: Se ha creado la historia '{titulo}' con {sp_val} SP]*."

                elif action_type == "add_task":
                    # Cualquier miembro del proyecto puede añadir tareas técnicas
                    h_id = params.get("historia_id", "")
                    titulo = params.get("titulo", "")
                    hours = int(params.get("estimated_hours", 1))
                    desc = params.get("descripcion", "") or None
                    await scrum.add_tarea(pid, h_id, titulo, hours, desc)
                    ai_response += f"\n\n*[Acción del Sistema: Se ha agregado la tarea '{titulo}' ({hours}h)]*."

                elif action_type == "update_sprint":
                    if not is_admin and project_role not in ["owner", "scrum_master"]:
                        ai_response += "\n\n*[Error: No tienes permisos para modificar Sprints. Solo los Scrum Masters, Owners o Administradores pueden hacerlo]*."
                        return ChatResponse(response=ai_response, action_type="none")
                    
                    s_id = params.get("sprint_id", "")
                    status = params.get("status", "")
                    if status == "active":
                        already_active = any(
                            s["status"] == "active" for s in proyecto_dict["sprints"]
                        )
                        if already_active:
                            ai_response += "\n\n*[Error del Sistema: Ya existe un sprint activo. Ciérralo primero]*."
                            return ChatResponse(response=ai_response, action_type="none")
                    await scrum.update_sprint_status(pid, s_id, status)
                    ai_response += f"\n\n*[Acción del Sistema: Estado del sprint actualizado a '{status}']*."

                elif action_type == "update_story":
                    # Cualquier miembro del proyecto puede actualizar el estado de las historias de usuario
                    story_id = params.get("story_id", "")
                    status = params.get("status", "")
                    await scrum.update_historia(pid, story_id, status=status)
                    ai_response += f"\n\n*[Acción del Sistema: Estado de la historia actualizado a '{status}']*."

            except Exception as exc:
                ai_response += f"\n\n*[Error del Sistema al ejecutar acción: {exc}]*."

        return ChatResponse(response=ai_response, action_type=action_type)
