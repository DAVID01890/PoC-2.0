import React, { useState, useEffect } from "react";
import {
  Container, Row, Col, Card, Alert, CardBody, Button, Label, Input, FormFeedback, Form, Modal, ModalHeader, ModalBody, Spinner, FormGroup
} from "reactstrap";
import * as Yup from "yup";
import { useFormik } from "formik";
import { useSelector, useDispatch } from "react-redux";
import { createSelector } from "reselect";

import { getAvatarSrc } from "../../helpers/avatar_helper";
import { editProfile, resetProfileFlag } from "../../slices/thunks";

const avatars = [
  { id: "1", src: getAvatarSrc("1") },
  { id: "2", src: getAvatarSrc("2") },
  { id: "3", src: getAvatarSrc("3") },
  { id: "5", src: getAvatarSrc("5") },
  { id: "6", src: getAvatarSrc("6") },
  { id: "8", src: getAvatarSrc("8") },
];

const getAuthUser = () => {
  try {
    const raw = sessionStorage.getItem("authUser");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed.user || parsed.data || parsed;
  } catch {
    return null;
  }
};

const UserProfile = ({ isOpen, toggle }: { isOpen?: boolean; toggle?: () => void }) => {
  const dispatch: any = useDispatch();

  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userRole, setUserRole] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState("1");

  // Modals
  const [nameModal, setNameModal] = useState<boolean>(false);
  const [passwordModal, setPasswordModal] = useState<boolean>(false);
  const [avatarModal, setAvatarModal] = useState<boolean>(false);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passError, setPassError] = useState("");
  const [passSuccess, setPassSuccess] = useState("");
  const [passLoading, setPassLoading] = useState(false);

  const selectLayoutState = (state: any) => state.Profile;
  const userprofileData = createSelector(
    selectLayoutState,
    (state) => ({ user: state.user, success: state.success, error: state.error })
  );
  const { success, error } = useSelector(userprofileData);

  useEffect(() => {
    const authUser = getAuthUser();
    if (authUser) {
      setUserName(authUser.name || authUser.first_name || "Admin");
      setUserEmail(authUser.email || "");
      setSelectedAvatar(authUser.avatar || "1");
      setUserRole(authUser.role === 'admin' ? 'Administrador' : 'Miembro');
    }
  }, [success]);

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        dispatch(resetProfileFlag());
        setNameModal(false);
        setAvatarModal(false);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [success, dispatch]);

  const nameValidation = useFormik({
    enableReinitialize: true,
    initialValues: { name: userName },
    validationSchema: Yup.object({
      name: Yup.string().required("El nombre es requerido"),
    }),
    onSubmit: (values) => {
      dispatch(editProfile({ name: values.name, avatar: selectedAvatar }));
    },
  });

  const handleAvatarSelect = (id: string) => {
    setSelectedAvatar(id);
    dispatch(editProfile({ name: userName, avatar: id }));
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      setPassError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPassError("Las contraseñas no coinciden.");
      return;
    }

    try {
      setPassLoading(true);
      setPassError("");
      setPassSuccess("");
      await dispatch(editProfile({ name: userName, avatar: selectedAvatar, password: newPassword }));
      setPassSuccess("¡Contraseña actualizada correctamente!");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => {
        setPasswordModal(false);
        setPassSuccess("");
      }, 1500);
    } catch (err: any) {
      setPassError(err.message || "Error al actualizar contraseña");
    } finally {
      setPassLoading(false);
    }
  };

  const currentAvatar = avatars.find(a => a.id === selectedAvatar) || avatars[0];

  document.title = "Perfil | Luma";

  const renderProfileCard = () => (
    <Card className="border-0 shadow-lg overflow-hidden mb-0" style={{ background: "#1a1f24", borderRadius: "12px" }}>
      {/* Gradient Cover Header */}
      <div style={{
        height: "160px",
        background: "linear-gradient(135deg, #1b3a4b 0%, #1e555c 50%, #2f8386 100%)"
      }}></div>

      <CardBody className="p-4 pt-0 text-center position-relative">
        {/* Centered Avatar overlapping header */}
        <div className="position-relative d-inline-block" style={{ marginTop: "-80px", marginBottom: "15px" }}>
          <img 
            src={currentAvatar.src} 
            alt="" 
            className="rounded-circle border border-4 border-dark" 
            style={{ width: "130px", height: "130px", objectFit: "cover", borderColor: "#1a1f24 !important" }} 
          />
          {/* Camera icon to select Avatar */}
          <button 
            onClick={() => setAvatarModal(true)}
            className="btn btn-primary btn-sm rounded-circle position-absolute d-flex align-items-center justify-content-center" 
            style={{
              bottom: "5px",
              right: "5px",
              width: "32px",
              height: "32px",
              padding: "0",
              boxShadow: "0px 2px 4px rgba(0,0,0,0.3)"
            }}
          >
            <i className="ri-camera-lens-line fs-14"></i>
          </button>
        </div>

        <h4 className="fw-semibold text-white mb-1">{userName}</h4>
        <p className="text-muted mb-2">{userEmail}</p>
        <span className="badge bg-success-subtle text-success px-3 py-2 rounded-pill fs-12 fw-medium text-uppercase mb-4">
          {userRole}
        </span>

        <hr className="border-secondary my-4" />

        {/* SETTINGS CARD LIST (DARK THEME) */}
        <div className="text-start">
          
          {/* NOMBRE COMPLETO CARD */}
          <div className="d-flex align-items-center p-3 mb-3 rounded" style={{ background: "#22272e", border: "1px solid #2d333b" }}>
            <div className="avatar-sm flex-shrink-0">
              <span className="avatar-title bg-primary-subtle text-primary rounded-circle fs-18" style={{ width: "42px", height: "42px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <i className="ri-user-line"></i>
              </span>
            </div>
            <div className="flex-grow-1 ms-3">
              <small className="text-muted d-block mb-0" style={{ fontSize: "11px", textTransform: "uppercase" }}>Nombre de Usuario</small>
              <span className="fw-semibold text-white fs-14">{userName}</span>
            </div>
            <button 
              onClick={() => setNameModal(true)}
              className="btn btn-ghost-secondary btn-icon btn-sm rounded-circle text-muted"
            >
              <i className="ri-pencil-line fs-16"></i>
            </button>
          </div>

          {/* CORREO ELECTRONICO CARD (READ-ONLY) */}
          <div className="d-flex align-items-center p-3 mb-3 rounded" style={{ background: "#22272e", border: "1px solid #2d333b" }}>
            <div className="avatar-sm flex-shrink-0">
              <span className="avatar-title bg-info-subtle text-info rounded-circle fs-18" style={{ width: "42px", height: "42px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <i className="ri-mail-line"></i>
              </span>
            </div>
            <div className="flex-grow-1 ms-3">
              <small className="text-muted d-block mb-0" style={{ fontSize: "11px", textTransform: "uppercase" }}>Correo Electrónico</small>
              <span className="fw-semibold text-white fs-14">{userEmail}</span>
            </div>
          </div>

          {/* CONTRASEÑA CARD */}
          <div className="d-flex align-items-center p-3 mb-3 rounded" style={{ background: "#22272e", border: "1px solid #2d333b" }}>
            <div className="avatar-sm flex-shrink-0">
              <span className="avatar-title bg-danger-subtle text-danger rounded-circle fs-18" style={{ width: "42px", height: "42px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <i className="ri-lock-line"></i>
              </span>
            </div>
            <div className="flex-grow-1 ms-3">
              <small className="text-muted d-block mb-0" style={{ fontSize: "11px", textTransform: "uppercase" }}>Contraseña</small>
              <span className="fw-semibold text-white fs-14">••••••••</span>
            </div>
            <button 
              onClick={() => setPasswordModal(true)}
              className="btn btn-ghost-secondary btn-icon btn-sm rounded-circle text-muted"
            >
              <i className="ri-pencil-line fs-16"></i>
            </button>
          </div>

        </div>
      </CardBody>
    </Card>
  );

  const mainContent = (
    <React.Fragment>
      {isOpen !== undefined ? (
        <Modal isOpen={isOpen} toggle={toggle} centered size="md" className="border-0 dark-modal" contentClassName="bg-transparent border-0">
          <div className="modal-content border-0" style={{ background: "#1a1f24", borderRadius: "12px" }}>
            <div className="modal-header border-0 pb-0" style={{ position: "absolute", top: "15px", right: "15px", zIndex: 10 }}>
              <button type="button" className="btn-close btn-close-white" onClick={toggle} aria-label="Close"></button>
            </div>
            <ModalBody className="p-0 border-0">
              {renderProfileCard()}
            </ModalBody>
          </div>
        </Modal>
      ) : (
        <div className="page-content" style={{ minHeight: "100vh", background: "#111417" }}>
          <Container>
            <Row className="justify-content-center">
              <Col lg={8} md={10}>
                {renderProfileCard()}
              </Col>
            </Row>
          </Container>
        </div>
      )}

      {/* MODAL: CAMBIAR NOMBRE */}
      <Modal isOpen={nameModal} toggle={() => setNameModal(!nameModal)} centered>
        <ModalHeader toggle={() => setNameModal(!nameModal)}>Cambiar Nombre</ModalHeader>
        <ModalBody>
          <Form onSubmit={nameValidation.handleSubmit}>
            <FormGroup className="mb-3">
              <Label className="form-label">Nombre de Usuario</Label>
              <Input
                name="name"
                placeholder="Ingresa tu nombre"
                type="text"
                onChange={nameValidation.handleChange}
                onBlur={nameValidation.handleBlur}
                value={nameValidation.values.name}
                invalid={nameValidation.touched.name && !!nameValidation.errors.name}
              />
              {nameValidation.touched.name && nameValidation.errors.name && (
                <FormFeedback type="invalid">{nameValidation.errors.name}</FormFeedback>
              )}
            </FormGroup>
            <div className="text-end mt-4">
              <Button type="button" color="light" className="me-2" onClick={() => setNameModal(false)}>
                Cancelar
              </Button>
              <Button type="submit" color="success">
                Guardar Cambios
              </Button>
            </div>
          </Form>
        </ModalBody>
      </Modal>

      {/* MODAL: CAMBIAR CONTRASEÑA */}
      <Modal isOpen={passwordModal} toggle={() => setPasswordModal(!passwordModal)} centered>
        <ModalHeader toggle={() => setPasswordModal(!passwordModal)}>Cambiar Contraseña</ModalHeader>
        <ModalBody>
          {passError && <Alert color="danger">{passError}</Alert>}
          {passSuccess && <Alert color="success">{passSuccess}</Alert>}
          <Form onSubmit={handlePasswordSubmit}>
            <FormGroup className="mb-3">
              <Label className="form-label">Nueva Contraseña</Label>
              <Input
                type="password"
                placeholder="Mínimo 6 caracteres"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </FormGroup>
            <FormGroup className="mb-3">
              <Label className="form-label">Confirmar Nueva Contraseña</Label>
              <Input
                type="password"
                placeholder="Repite la contraseña"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </FormGroup>
            <div className="text-end mt-4">
              <Button type="button" color="light" className="me-2" onClick={() => setPasswordModal(false)} disabled={passLoading}>
                Cancelar
              </Button>
              <Button type="submit" color="success" disabled={passLoading}>
                {passLoading ? <Spinner size="sm" /> : "Guardar Contraseña"}
              </Button>
            </div>
          </Form>
        </ModalBody>
      </Modal>

      {/* MODAL: SELECCIONAR FOTO DE PERFIL */}
      <Modal isOpen={avatarModal} toggle={() => setAvatarModal(!avatarModal)} centered size="md">
        <ModalHeader toggle={() => setAvatarModal(!avatarModal)}>Selecciona tu Foto de Perfil</ModalHeader>
        <ModalBody className="p-4">
          <Row className="g-3">
            {avatars.map((a) => (
              <Col xs={4} sm={4} key={a.id} className="text-center">
                <div
                  className={`avatar-selector p-1 rounded-circle d-inline-block cursor-pointer transition-all ${selectedAvatar === a.id ? 'border border-3 border-primary' : 'border border-2'}`}
                  onClick={() => handleAvatarSelect(a.id)}
                  style={{ cursor: 'pointer', overflow: 'hidden', width: '90px', height: '90px' }}
                >
                  <img src={a.src} alt={`Avatar ${a.id}`} className="img-fluid rounded-circle h-100 w-100" style={{ objectFit: 'cover' }} />
                </div>
              </Col>
            ))}
          </Row>
          <div className="text-end mt-4">
            <Button type="button" color="light" onClick={() => setAvatarModal(false)}>
              Cerrar
            </Button>
          </div>
        </ModalBody>
      </Modal>
    </React.Fragment>
  );

  return mainContent;
};

export default UserProfile;
