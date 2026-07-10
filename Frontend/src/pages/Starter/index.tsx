import React from 'react';
import { Container, Row, Col, Card, CardBody } from 'reactstrap';
import BreadCrumb from '../../Components/Common/BreadCrumb';

const Starter = () => {
    document.title = "Home | Luma - Admin & Dashboard Template";
    return (
        <React.Fragment>
            <div className="page-content">
                <Container fluid>
                    <BreadCrumb title="Home" pageTitle="Luma" />
                    <Row>
                        {[...Array(20)].map((_, i) => (
                            <Col xs={12} key={i}>
                                <Card>
                                    <CardBody>
                                        <h5 className="card-title mb-4">Sección de prueba {i + 1}</h5>
                                        <p className="text-muted">Este es contenido de relleno para probar el desplazamiento de la página y verificar que el footer permanezca fijo.</p>
                                    </CardBody>
                                </Card>
                            </Col>
                        ))}
                    </Row>
                </Container>
            </div>
        </React.Fragment>
    );
};

export default Starter;
