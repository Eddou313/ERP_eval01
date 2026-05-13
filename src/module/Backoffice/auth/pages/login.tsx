import { useEffect, useState, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AUTH_STATIC_EMAIL, AUTH_STATIC_PASSWORD, getStoredAuthSession, loginEmployee } from "../api/authAPI";
import "./login.css";

export function Login() {
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);

    const navigate = useNavigate();
    const location = useLocation();
    const [credentials, setCredentials] = useState({ gmail: AUTH_STATIC_EMAIL, password: AUTH_STATIC_PASSWORD });

    useEffect(() => {
        if (getStoredAuthSession()) {
            navigate("/Dashbord", { replace: true });
        }
    }, [navigate]);

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();

        setLoading(true);
        setMessage("");

        try {
            const session = await loginEmployee(credentials.gmail, credentials.password);
            const fromPath = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname;
            navigate(fromPath ?? "/Dashbord", { replace: true, state: { employee: session.employee } });
        } catch (error) {
            setMessage(error instanceof Error ? error.message : "Connexion impossible.");
        } finally {
            setLoading(false);
        }
    }

    return(
        <main className="authPage">
            <section className="authCard">
                <header className="authHeader">
                    <p className="authEyebrow">Backoffice</p>
                    <h1 className="authTitle">Connexion interne</h1>
                    <p className="authDescription">Accès réservé à l'administration locale.</p>
                </header>
                <form className="authForm" onSubmit={handleSubmit}>
                    <div className="authField">
                        <label className="authLabel" htmlFor="username">Email</label>
                        <input
                            className="authInput"
                            type="text"
                            id="username"
                            name="username"
                            value={credentials.gmail}
                            onChange={(e) => setCredentials({ gmail: e.target.value, password: credentials.password })}
                            autoComplete="username"
                            required
                        />
                    </div>
                    <div className="authField">
                        <label className="authLabel" htmlFor="password">Mot de passe</label>
                        <input
                            className="authInput"
                            type="password"
                            id="password"
                            name="password"
                            value={credentials.password}
                            onChange={(e) => setCredentials({ gmail: credentials.gmail, password: e.target.value })}
                            autoComplete="current-password"
                            required
                        />
                    </div>
                    <button className="authButton" type="submit" disabled={loading}>
                        {loading ? "Connexion..." : "Se connecter"}
                    </button>
                </form>
                {message && <p className="authMessage">{message}</p>}
            </section>
        </main>
    );
}
export default Login;
