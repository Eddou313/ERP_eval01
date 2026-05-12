import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import FrontOfficeHeader from "../../include/FrontOfficeHeader";
import { checUser } from "../api/clientAPI";
import "./ClientLogin.css";

export default function ClientLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [Info] = useState({gmail:"",password:""});

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (!email) throw new Error("Veuillez renseigner votre email.");
      if (!password) throw new Error("Veuillez renseigner votre mot de passe.");

    const success = await checUser(email,password);

      if (success) {
        console.log("Connexion réussie !",Info.gmail);
        navigate('/'); // Redirection vers l'accueil
      } else {
        alert("Email ou mot de passe incorrect.");
      }
    } catch (err: any) {
      setError(err.message || "Erreur lors de la connexion");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="clientLoginPage">
      <FrontOfficeHeader />
      <main className="clientLoginMain">
        <div className="loginContainer">
          <div className="loginCard">
            <h1>Connexion Client</h1>
            <p className="loginSubtitle">Accédez à votre compte</p>

            {error && <div className="errorMessage">{error}</div>}

            <form onSubmit={handleLogin} className="loginForm">
              <div className="formGroup">
                <label htmlFor="email">Email</label>
                <input
                  type="email"
                  id="email"
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="votre@email.com"
                />
              </div>

              <div className="formGroup">
                <label htmlFor="password">Mot de passe</label>
                <input
                  type="password"
                  id="password"
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>

              <button type="submit" disabled={loading} className="submitButton">
                {loading ? "Connexion en cours..." : "Se connecter"}
              </button>
              <p className="loginFooter">Pas encore de compte ? 
                <Link to="/register">Inscrivez-vous ici</Link>
              </p>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
