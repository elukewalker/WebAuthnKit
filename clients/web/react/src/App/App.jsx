import React, { useEffect } from 'react';
import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Container, Row, Col } from 'react-bootstrap';

import { history } from '../_helpers';
import { alertActions } from '../_actions';
import { PrivateRoute } from '../_components';
import { HomePage } from '../HomePage';
import { LoginPage } from '../LoginPage';
import { LoginWithSecurityKeyPage } from '../LoginWithSecurityKeyPage';
import { RegisterPage } from '../RegisterPage';

import { Amplify } from 'aws-amplify';
import aws_exports from '../aws-exports';

Amplify.configure(aws_exports);

function App() {
    const alert = useSelector(state => state.alert);
    const dispatch = useDispatch();

    //console.log(JSON.stringify(config));

    useEffect(() => {
        history.listen((location, action) => {
            // clear alert on location change
            dispatch(alertActions.clear());
        });
    }, []);

    return (
        <div className="jumbotron">
            <div className="container">
                <div className="col-md-6 offset-md-3">
                        {alert.message &&
                            <div className={`alert ${alert.type}`}>{alert.message}</div>
                        }
                        <BrowserRouter>
                            <Routes>
                                <Route path="/" element={<PrivateRoute><HomePage /></PrivateRoute>} />
                                <Route path="/login" element={<LoginPage />} />
                                <Route path="/loginWithSecurityKey" element={<LoginWithSecurityKeyPage />} />
                                <Route path="/register" element={<RegisterPage />} />
                                <Route path="*" element={<Navigate to="/" replace />} />
                            </Routes>
                        </BrowserRouter>
                
                </div>
            </div>
        </div>
    );
}

export { App };