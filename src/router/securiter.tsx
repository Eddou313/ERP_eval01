import { Navigate, Outlet, useLocation } from "react-router-dom";
import { getStoredAuthSession } from "../module/Backoffice/auth/api/authAPI";
import SidebarNav from "../include/SidebarNav";

function SecureRoute() {
	const location = useLocation();
	const session = getStoredAuthSession();

	if (!session) {
		return <Navigate to="/admin/login" replace state={{ from: location }} />;
	}

	return (
		<div style={{ display: "flex", minHeight: "100vh" }}>
			<SidebarNav />
			<main style={{ flex: 1, marginLeft: "18%", width: "calc(100% - 18%)" }}>
				<Outlet />
			</main>
		</div>
	);
}

export default SecureRoute;
