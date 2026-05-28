import React, { useEffect } from 'react';
import { BrowserRouter, Route, Routes, Navigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Container, Row, Col } from 'react-bootstrap';

import { alertActions } from '../_actions';
import { PrivateRoute } from '../_components';
import { HomePage } from '../HomePage';
import { LoginPage } from '../LoginPage';
import { LoginWithSecurityKeyPage } from '../LoginWithSecurityKeyPage';
import { RegisterPage } from '../RegisterPage';

import { Amplify } from 'aws-amplify';
import aws_exports from '../aws-exports';

Amplify.configure({
    Auth: {
        Cognito: {
            userPoolId: aws_exports.Auth.userPoolId,
            userPoolClientId: aws_exports.Auth.userPoolWebClientId,
        }
    }
});

// Component to handle alert clearing on route change
function AlertClearer() {
    const location = useLocation();
    const dispatch = useDispatch();

    useEffect(() => {
        // clear alert on location change
        dispatch(alertActions.clear());
    }, [location, dispatch]);

    return null;
}

function App() {
    const alert = useSelector(state => state.alert);

    return (
        <div className="jumbotron">
            <div className="container">
                <div className="col-md-6 offset-md-3">
                        {alert.message &&
                            <div className={`alert ${alert.type}`}>{alert.message}</div>
                        }
                        <BrowserRouter>
                            <AlertClearer />
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