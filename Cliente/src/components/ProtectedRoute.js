import { useContext, useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { UserContext } from "./UserContext";

export default function PrivateRoute() {
  const { userInfo } = useContext(UserContext);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userInfo !== undefined) {
      setLoading(false);
    }
  }, [userInfo]);

  if (loading) return null;

  return userInfo ? <Outlet /> : <Navigate to="/login" />;
}
