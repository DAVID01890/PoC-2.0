import React from 'react';
import { Modal, ModalBody, Button, Spinner } from 'reactstrap';

interface ConfirmModalProps {
    isOpen: boolean;
    title?: string;
    message: string;
    confirmText?: string;
    confirmColor?: string;
    icon?: string;
    loading?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
    isOpen,
    title = "¿Estás seguro?",
    message,
    confirmText = "Sí, eliminar",
    confirmColor = "danger",
    icon = "ri-error-warning-line",
    loading = false,
    onConfirm,
    onCancel,
}) => {
    return (
        <Modal isOpen={isOpen} toggle={onCancel} centered size="sm">
            <ModalBody className="py-4 px-4 text-center">
                <div className={`text-${confirmColor} mb-3`}>
                    <i className={`${icon} display-4`}></i>
                </div>
                <h5 className="fw-semibold mb-2">{title}</h5>
                <p className="text-muted mb-4" style={{ fontSize: '14px' }}>{message}</p>
                <div className="d-flex justify-content-center gap-2">
                    <Button
                        color="light"
                        onClick={onCancel}
                        disabled={loading}
                        className="px-4"
                    >
                        Cancelar
                    </Button>
                    <Button
                        color={confirmColor}
                        onClick={onConfirm}
                        disabled={loading}
                        className="px-4"
                    >
                        {loading ? <Spinner size="sm" className="me-1" /> : null}
                        {confirmText}
                    </Button>
                </div>
            </ModalBody>
        </Modal>
    );
};

export default ConfirmModal;
