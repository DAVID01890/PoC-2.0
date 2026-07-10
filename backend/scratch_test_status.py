import asyncio
from uuid import UUID
from src.scrum.adapters.proyecto_repo_sqlite import ProyectoRepositorySQLite
from src.scrum.domain.entities import ProyectoId, HistoriaId, HistoriaStatus, TareaTecnicaStatus

async def test():
    repo = ProyectoRepositorySQLite()
    pid = ProyectoId(UUID("33ff72a9-75a2-4ccf-bc2f-e17ae96065b5"))
    hid = HistoriaId(UUID("c44cf472-3a65-463b-8fd6-699f7c505cb0"))
    
    proyecto = await repo.find_by_id(pid)
    if not proyecto:
        print("Project not found")
        return
        
    print(f"Project: {proyecto.nombre}")
    try:
        historia = proyecto.get_historia(hid)
        print(f"Story: {historia.title} - Current status: {historia.status}")
    except Exception as e:
        print(f"Error getting story: {e}")
        return

    # Simulate the update_historia_status handler logic
    try:
        new_status = HistoriaStatus.DONE
        historia._status = new_status
        
        # Synchronize task statuses
        target_task_status = TareaTecnicaStatus.DONE
            
        for tarea in proyecto.tareas:
            if tarea.historia_id == hid:
                print(f"Syncing task {tarea.title} ({tarea.id}) to {target_task_status}")
                tarea._status = target_task_status
                
        await repo.save(proyecto)
        print("Save successful!")
    except Exception as e:
        import traceback
        traceback.print_exc()

asyncio.run(test())
