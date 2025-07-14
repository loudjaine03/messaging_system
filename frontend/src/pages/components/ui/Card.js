import React from "react";

export const Card = ({ children }) => (
  <div className="bg-white p-4 shadow-md rounded-lg">{children}</div>
);

export const CardContent = ({ children }) => <div>{children}</div>;
