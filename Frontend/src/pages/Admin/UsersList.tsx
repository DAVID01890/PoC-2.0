import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, CardBody, Table, Badge, Spinner, Alert, Button, Modal, ModalHeader, ModalBody } from 'reactstrap';
import BreadCrumb from '../../Components/Common/BreadCrumb';
import { getUsersList, resetUserPassword, deleteUser } from '../../helpers/fakebackend_helper';
import { getAvatarSrc } from '../../helpers/avatar_helper';
import { Form, FormGroup, Label, Input } from 'reactstrap';
import { getLoggedinUser } from '../../helpers/api_helper';

const UsersList = () => {
    document.title = "Usuarios | Panel de Administración";

    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string>("");

    // Modal state for viewing details
    const [selectedUser, setSelectedUser] = useState<any>(null);
    const [detailsModal, setDetailsModal] = useState<boolean>(false);

    const toggleDetailsModal = () => setDetailsModal(!detailsModal);

    const handleViewDetails = (user: any) => {
        setSelectedUser(user);
        setDetailsModal(true);
    };

    // Reset password modal states
    const [passwordModal, setPasswordModal] = useState<boolean>(false);
    const [selectedUserForPassword, setSelectedUserForPassword] = useState<any>(null);
    const [newPassword, setNewPassword] = useState<string>("");
    const [passwordError, setPasswordError] = useState<string>("");
    const [passwordSuccess, setPasswordSuccess] = useState<string>("");
    const [passwordSubmitLoading, setPasswordSubmitLoading] = useState<boolean>(false);

    // Delete user modal states
    const [deleteModal, setDeleteModal] = useState<boolean>(false);
    const [selectedUserForDelete, setSelectedUserForDelete] = useState<any>(null);
    const [deleteLoading, setDeleteLoading] = useState<boolean>(false);
    const [deleteError, setDeleteError] = useState<string>("");

    const currentUser = getLoggedinUser();

    const togglePasswordModal = () => {
        setPasswordModal(!passwordModal);
        if (passwordModal) {
            setNewPassword("");
            setPasswordError("");
            setPasswordSuccess("");
        }
    };

    const handleOpenResetModal = (user: any) => {
        setSelectedUserForPassword(user);
        setNewPassword("");
        setPasswordError("");
        setPasswordSuccess("");
        setPasswordModal(true);
    };

    const handleResetPasswordSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedUserForPassword) return;
        if (!newPassword || newPassword.length < 6) {
            setPasswordError("La contraseña debe tener al menos 6 caracteres.");
            return;
        }

        try {
            setPasswordSubmitLoading(true);
            setPasswordError("");
            setPasswordSuccess("");
            await resetUserPassword(selectedUserForPassword.id, { password: newPassword });
            setPasswordSuccess(`¡Contraseña de ${selectedUserForPassword.name} restablecida con éxito!`);
            setTimeout(() => {
                setPasswordModal(false);
            }, 2000);
        } catch (err: any) {
            setPasswordError(err.message || err || "Error al restablecer la contraseña");
        } finally {
            setPasswordSubmitLoading(false);
        }
    };

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const response: any = await getUsersList();
            setUsers(response);
        } catch (err: any) {
            setError(err.message || err || "Error al obtener la lista de usuarios");
        } finally {
            setLoading(false);
        }
    };

    const handleOpenDeleteModal = (user: any) => {
        setSelectedUserForDelete(user);
        setDeleteError("");
        setDeleteModal(true);
    };

    const handleConfirmDelete = async () => {
        if (!selectedUserForDelete) return;
        try {
            setDeleteLoading(true);
            setDeleteError("");
            await deleteUser(selectedUserForDelete.id);
            setDeleteModal(false);
            setSelectedUserForDelete(null);
            fetchUsers();
        } catch (err: any) {
            setDeleteError(err.message || err || "Error al eliminar el usuario");
        } finally {
            setDeleteLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    return (
        <React.Fragment>
            <div className="page-content">
                <Container fluid>
                    <BreadCrumb title="Usuarios" pageTitle="Administración" />

                    {error && <Alert color="danger">{error}</Alert>}

                    <Row>
                        <Col lg={12}>
                            <Card>
                                <CardBody>
                                    <div className="d-flex align-items-center justify-content-between mb-4">
                                        <h5 className="card-title mb-0">Usuarios Registrados</h5>
                                        <Badge color="info" className="px-3 py-2 fs-12">
                                            Total: {users.length}
                                        </Badge>
                                    </div>

                                    {loading ? (
                                         <div className="d-flex flex-column justify-content-center align-items-center py-5" style={{ minHeight: "30vh" }}>
                                             <Spinner color="primary" />
                                             <p className="mt-3 text-muted">Cargando lista de usuarios...</p>
                                         </div>
                                     ) : users.length === 0 ? (
                                         <div className="text-center py-4">
                                             <p className="text-muted">No hay usuarios registrados.</p>
                                         </div>
                                     ) : (
                                        <div className="table-responsive">
                                            <Table className="table-centered align-middle table-nowrap mb-0">
                                                <thead className="table-light">
                                                    <tr>
                                                        <th>Usuario</th>
                                                        <th>Email</th>
                                                        <th>Rol</th>
                                                        <th>Estado</th>
                                                        <th>Acciones</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {users.map((user: any) => (
                                                        <tr key={user.id}>
                                                            <td>
                                                                <div className="d-flex align-items-center gap-3">
                                                                    <img 
                                                                        src={getAvatarSrc(user.avatar)} 
                                                                        alt={user.name} 
                                                                        className="avatar-xs rounded-circle"
                                                                    />
                                                                    <div>
                                                                        <h6 className="mb-0">{user.name}</h6>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td>{user.email}</td>
                                                            <td>
                                                                <Badge 
                                                                    color={user.role === 'admin' ? 'danger' : 'success'} 
                                                                    className="text-uppercase px-2"
                                                                >
                                                                    {user.role}
                                                                </Badge>
                                                            </td>
                                                            <td>
                                                                <Badge color={user.is_active ? "success" : "danger"} className="px-2">
                                                                    {user.is_active ? "Activo" : "Inactivo"}
                                                                </Badge>
                                                            </td>
                                                            <td>
                                                                <div className="d-flex gap-2">
                                                                    <Button color="light" size="sm" onClick={() => handleViewDetails(user)}>
                                                                        <i className="ri-eye-line align-bottom me-1"></i> Ver Detalles
                                                                    </Button>
                                                                    <Button color="soft-warning" size="sm" onClick={() => handleOpenResetModal(user)}>
                                                                        <i className="ri-key-line align-bottom me-1"></i> Contraseña
                                                                    </Button>
                                                                    {currentUser?.user?.role === 'admin' && currentUser?.user?.id !== user.id && (
                                                                        <Button color="soft-danger" size="sm" onClick={() => handleOpenDeleteModal(user)}>
                                                                            <i className="ri-delete-bin-line align-bottom me-1"></i> Eliminar
                                                                        </Button>
                                                                    )}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </Table>
                                        </div>
                                     )}
                                </CardBody>
                            </Card>
                        </Col>
                    </Row>
                </Container>
            </div>

            {/* Modal: Detalles del Usuario */}
            <Modal isOpen={detailsModal} toggle={toggleDetailsModal} centered>
                <ModalHeader toggle={toggleDetailsModal}>Detalles del Usuario</ModalHeader>
                <ModalBody className="p-4">
                    {selectedUser && (
                        <div className="text-center mb-4">
                            <div className="position-relative d-inline-block mb-3">
                                <img 
                                    src={getAvatarSrc(selectedUser.avatar)} 
                                    alt={selectedUser.name} 
                                    className="avatar-lg rounded-circle img-thumbnail"
                                    style={{ width: '96px', height: '96px', objectFit: 'cover' }}
                                />
                            </div>
                            <h5 className="fs-16 mb-1">{selectedUser.name}</h5>
                            <p className="text-muted mb-3">{selectedUser.email}</p>
                            
                            <div className="table-responsive text-start">
                                <Table bordered size="sm" className="mb-0">
                                    <tbody>
                                        <tr>
                                            <th className="bg-light w-30" style={{ padding: '0.7rem' }}>ID de Usuario</th>
                                            <td style={{ padding: '0.7rem' }} className="font-monospace text-muted fs-12">
                                                {selectedUser.id}
                                            </td>
                                        </tr>
                                        <tr>
                                            <th className="bg-light" style={{ padding: '0.7rem' }}>Rol de Acceso</th>
                                            <td style={{ padding: '0.7rem' }}>
                                                <Badge 
                                                    color={selectedUser.role === 'admin' ? 'danger' : 'success'} 
                                                    className="text-uppercase"
                                                >
                                                    {selectedUser.role}
                                                </Badge>
                                            </td>
                                        </tr>
                                        <tr>
                                            <th className="bg-light" style={{ padding: '0.7rem' }}>Estado del Usuario</th>
                                            <td style={{ padding: '0.7rem' }}>
                                                <Badge color={selectedUser.is_active ? "success" : "danger"}>
                                                    {selectedUser.is_active ? "Activo" : "Inactivo"}
                                                </Badge>
                                            </td>
                                        </tr>
                                    </tbody>
                                </Table>
                            </div>
                        </div>
                    )}
                    <div className="text-end mt-4">
                        <Button color="light" onClick={toggleDetailsModal}>
                            Cerrar
                        </Button>
                    </div>
                </ModalBody>
            </Modal>

            {/* Modal: Cambiar Contraseña */}
            <Modal isOpen={passwordModal} toggle={togglePasswordModal} centered>
                <ModalHeader toggle={togglePasswordModal}>Restablecer Contraseña</ModalHeader>
                <ModalBody className="p-4">
                    {selectedUserForPassword && (
                        <div>
                            <div className="d-flex align-items-center gap-3 mb-4">
                                <img 
                                    src={getAvatarSrc(selectedUserForPassword.avatar)} 
                                    alt={selectedUserForPassword.name} 
                                    className="avatar-sm rounded-circle"
                                />
                                <div>
                                    <h6 className="mb-0">{selectedUserForPassword.name}</h6>
                                    <p className="text-muted mb-0 fs-12">{selectedUserForPassword.email}</p>
                                </div>
                            </div>

                            {passwordError && <Alert color="danger">{passwordError}</Alert>}
                            {passwordSuccess && <Alert color="success">{passwordSuccess}</Alert>}

                            <Form onSubmit={handleResetPasswordSubmit}>
                                <FormGroup className="mb-3">
                                    <Label for="new-password">Nueva Contraseña</Label>
                                    <Input
                                        id="new-password"
                                        type="password"
                                        placeholder="Ingrese al menos 6 caracteres"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        required
                                    />
                                </FormGroup>
                                <div className="text-end mt-4 d-flex justify-content-end gap-2">
                                    <Button color="light" type="button" onClick={togglePasswordModal} disabled={passwordSubmitLoading}>
                                        Cancelar
                                    </Button>
                                    <Button color="warning" type="submit" disabled={passwordSubmitLoading}>
                                        {passwordSubmitLoading ? <Spinner size="sm" /> : "Guardar Contraseña"}
                                    </Button>
                                </div>
                            </Form>
                        </div>
                    )}
                </ModalBody>
            </Modal>

            {/* Modal: Confirmar Eliminación de Usuario */}
            <Modal isOpen={deleteModal} toggle={() => setDeleteModal(false)} centered>
                <ModalHeader toggle={() => setDeleteModal(false)}>Eliminar Usuario</ModalHeader>
                <ModalBody className="p-4">
                    {selectedUserForDelete && (
                        <div>
                            <div className="d-flex align-items-center gap-3 mb-4">
                                <img
                                    src={getAvatarSrc(selectedUserForDelete.avatar)}
                                    alt={selectedUserForDelete.name}
                                    className="avatar-sm rounded-circle"
                                />
                                <div>
                                    <h6 className="mb-0">{selectedUserForDelete.name}</h6>
                                    <p className="text-muted mb-0 fs-12">{selectedUserForDelete.email}</p>
                                </div>
                            </div>
                            <Alert color="danger" className="mb-3">
                                <i className="ri-error-warning-line me-2"></i>
                                ¿Estás seguro de que deseas <strong>eliminar permanentemente</strong> esta cuenta?
                                Esta acción no se puede deshacer.
                            </Alert>
                            {deleteError && <Alert color="danger">{deleteError}</Alert>}
                            <div className="d-flex justify-content-end gap-2 mt-3">
                                <Button color="light" onClick={() => setDeleteModal(false)} disabled={deleteLoading}>
                                    Cancelar
                                </Button>
                                <Button color="danger" onClick={handleConfirmDelete} disabled={deleteLoading}>
                                    {deleteLoading ? <Spinner size="sm" /> : <><i className="ri-delete-bin-line me-1"></i> Eliminar Cuenta</>}
                                </Button>
                            </div>
                        </div>
                    )}
                </ModalBody>
            </Modal>
        </React.Fragment>
    );
};

export default UsersList;
