import React from 'react';
import { Col, Container, Row } from 'reactstrap';

const Footer = () => {
    const isInsideProject = window.location.pathname !== "/home" && window.location.pathname !== "/profile";

    return (
        <React.Fragment>
            <footer className="footer" style={!isInsideProject ? { left: 0 } : undefined}>
                <Container fluid>
                    <Row>
                        <Col sm={6}>
                            {new Date().getFullYear()} © Luma. Todos los derechos reservados.
                        </Col>
                        <Col sm={6}>
                            <div className="text-sm-end d-none d-sm-block">
                                Diseño & Desarrollo por Luma Team
                            </div>
                        </Col>
                    </Row>
                </Container>
            </footer>
        </React.Fragment>
    );
};

export default Footer;