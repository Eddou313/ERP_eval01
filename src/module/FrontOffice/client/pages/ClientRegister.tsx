import  { useState, type ChangeEvent } from 'react';
import FrontOfficeHeader from '../../include/FrontOfficeHeader';
import {  saveClientSession } from '../api/clientAPI';
import { useNavigate } from 'react-router-dom';
import { createClient,DEFAULT_CLIENT_FORM } from '../../../Backoffice/client/api/clientApi';
// import { useNavigate } from 'react-router-dom';

interface RegisterFormData {
  title: string;
  firstname: string;
  lastname: string;
  email: string;
  password: string;
  birthdate: string;
}

export function ClientRegister() {
//   const navigate = useNavigate();
  
    const [formData, setFormData] = useState<RegisterFormData>({
        title: '',
        firstname: '',
        lastname: '',
        email: '',
        password: '',
        birthdate: ''
    });

    // Correction du type de l'événement
    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;

        setFormData((prev) => ({ 
        ...prev, 
        [name]: value 
        }));
    };
    const navigate = useNavigate();  
    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    try {
      // Préparation des données pour correspondre à ton interface ClientForm
      const clientToCreate = {
        ...DEFAULT_CLIENT_FORM,
        id_gender: formData.title === "M." ? 1 : 2,
        firstname: formData.firstname,
        lastname: formData.lastname,
        email: formData.email,
        passwd: formData.password,
        birthday: formData.birthdate,
      };

      // 1. Appel de ta fonction API (qui est une fonction async standard)
      const newClientId = await createClient(clientToCreate);

      if (newClientId) {
        
        saveClientSession({
          id: String(newClientId),
          email: formData.email,
          prenom: formData.firstname,
          nom: formData.lastname,
          token: btoa(`${formData.email}:${formData.password}`)
        });

        navigate('/');
      }
    } catch (error) {
      console.error("Erreur registre:", error);
      alert("Une erreur est survenue lors de la création du compte.");
    }
  };
  

  return (
    <div className="clientLoginPage">
              <FrontOfficeHeader />
      <main className="clientLoginMain">
        <div className="loginContainer">
          <div className="loginCard">
            <h1>Créer un compte</h1>
            <p className="loginSubtitle">Veuillez remplir les informations ci-dessous</p>

            <form className="loginForm" onSubmit={handleSubmit}>
              {/* Titre */}
              <div className="formGroup">
                <label>Titre</label>
                <div style={{ display: "flex", gap: "20px", padding: "0.5rem 0" }}>
                  <label style={{ fontWeight: "normal", display: "flex", alignItems: "center", gap: "5px" }}>
                    <input 
                      type="radio" name="title" value="M." 
                      checked={formData.title === "M."}
                      onChange={handleChange} required 
                    /> M.
                  </label>
                  <label style={{ fontWeight: "normal", display: "flex", alignItems: "center", gap: "5px" }}>
                    <input 
                      type="radio" name="title" value="Mme" 
                      checked={formData.title === "Mme"}
                      onChange={handleChange} 
                    /> Mme
                  </label>
                </div>
              </div>

              {/* Prénom */}
              <div className="formGroup">
                <label htmlFor="firstname">Prénom</label>
                <input
                  type="text" id="firstname" name="firstname"
                  placeholder="Ex: Jean-Marc"
                  pattern="^[a-zA-ZÀ-ÿ]+(\.\s[a-zA-ZÀ-ÿ]+)*$"
                  value={formData.firstname}
                  onChange={handleChange}
                  required
                />
              </div>

              {/* Nom */}
              <div className="formGroup">
                <label htmlFor="lastname">Nom</label>
                <input
                  type="text" id="lastname" name="lastname"
                  placeholder="Ex: Dupont"
                  pattern="^[a-zA-ZÀ-ÿ]+(\.\s[a-zA-ZÀ-ÿ]+)*$"
                  value={formData.lastname}
                  onChange={handleChange}
                  required
                />
              </div>

              {/* E-mail */}
              <div className="formGroup">
                <label htmlFor="email">E-mail</label>
                <input 
                  type="email" id="email" name="email" 
                  value={formData.email}
                  onChange={handleChange} required 
                />
              </div>

              {/* Mot de passe */}
              <div className="formGroup">
                <label htmlFor="password">Mot de passe</label>
                <input 
                  type="password" id="password" name="password" 
                  value={formData.password}
                  onChange={handleChange} required 
                />
              </div>

              {/* Date de naissance */}
              <div className="formGroup">
                <label htmlFor="birthdate">Date de naissance</label>
                <input
                  type="date" id="birthdate" name="birthdate"
                  value={formData.birthdate}
                  onChange={handleChange} required
                />
                <small style={{ color: "#888", fontSize: "0.8rem", marginTop: "4px" }}>
                  Ex. : 31/05/1970
                </small>
              </div>

              <button type="submit" className="submitButton">
                S'inscrire
              </button>
            </form>

            <div className="loginFooter">
              <p>Déjà inscrit ? <a href="#">Connectez-vous</a></p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default ClientRegister;