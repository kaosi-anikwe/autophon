import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

import { logout } from "../store/authSlice";
import { useAppDispatch } from "../hooks/useAppDispatch";
import { useToast } from "../hooks/useToast";

export function LogoutPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const toast = useToast();

  useEffect(() => {
    const handleLogout = async () => {
      try {
        await dispatch(logout()).unwrap();
        toast.success("You have been logged out successfully.", "Logged Out");
      } catch (error) {
        // Even if logout fails, we still show success since user intent is clear
        toast.info("You have been logged out.", "Logged Out");
        console.log(error);
      } finally {
        navigate("/");
      }
    };

    handleLogout();
  }, [dispatch, navigate, toast]);

  // Show loading while logout is processing
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="loading loading-spinner loading-lg"></div>
        <p className="mb-32 text-base-content">Logging out...</p>
      </div>
    </div>
  );
}
