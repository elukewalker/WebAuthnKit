import React from 'react';
import { Navigate } from 'react-router-dom';

export const PrivateRoute = ({ children }) => {
    return localStorage.getItem('user') ? children : <Navigate to="/login" replace />;
}