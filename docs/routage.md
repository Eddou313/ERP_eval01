# 🚀 React Router DOM - Guide Avancé (Structure Pro)

## 📦 Installation

```bash
npm install react-router-dom
```

---

# 🧱 1. Architecture recommandée

```
src/
├── pages/
│   ├── Home.jsx
│   ├── Login.jsx
│   ├── Dashboard.jsx
│   └── NotFound.jsx
├── components/
│   ├── Layout.jsx
│   └── PrivateRoute.jsx
├── router/
│   └── AppRouter.jsx
├── services/
│   └── auth.js
└── App.jsx
```

---

# 🧠 2. Layout (structure globale)

```jsx
// components/Layout.jsx
import { Link, Outlet } from "react-router-dom"

function Layout() {
  return (
    <div>
      <nav>
        <Link to="/">Home</Link>
        <Link to="/dashboard">Dashboard</Link>
      </nav>

      <hr />

      <Outlet />
    </div>
  )
}

export default Layout
```

---

# 🔒 3. Route protégée (Auth)

```jsx
// components/PrivateRoute.jsx
import { Navigate } from "react-router-dom"

function PrivateRoute({ children }) {
  const isAuth = localStorage.getItem("token")

  return isAuth ? children : <Navigate to="/login" />
}

export default PrivateRoute
```

---

# 🌐 4. Router principal

```jsx
// router/AppRouter.jsx
import {
  BrowserRouter,
  Routes,
  Route
} from "react-router-dom"

import Layout from "../components/Layout"
import PrivateRoute from "../components/PrivateRoute"

import Home from "../pages/Home"
import Login from "../pages/Login"
import Dashboard from "../pages/Dashboard"
import NotFound from "../pages/NotFound"

function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>

        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />

          <Route path="login" element={<Login />} />

          <Route
            path="dashboard"
            element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            }
          />

          <Route path="*" element={<NotFound />} />
        </Route>

      </Routes>
    </BrowserRouter>
  )
}

export default AppRouter
```

---

# ⚡ 5. Lazy Loading (optimisation)

```jsx
import { lazy, Suspense } from "react"

const Dashboard = lazy(() => import("../pages/Dashboard"))

<Suspense fallback={<h1>Loading...</h1>}>
  <Dashboard />
</Suspense>
```

---

# 🔁 6. Navigation dynamique

```jsx
import { useNavigate } from "react-router-dom"

function Login() {
  const navigate = useNavigate()

  const handleLogin = () => {
    localStorage.setItem("token", "123")
    navigate("/dashboard")
  }

  return <button onClick={handleLogin}>Login</button>
}
```

---

# 📌 7. Paramètres URL

```jsx
import { useParams } from "react-router-dom"

function Product() {
  const { id } = useParams()
  return <h1>Produit ID: {id}</h1>
}
```

Route :

```jsx
<Route path="/product/:id" element={<Product />} />
```

---

# 🌍 8. Service d’authentification (exemple)

```js
// services/auth.js
export const isAuthenticated = () => {
  return !!localStorage.getItem("token")
}

export const logout = () => {
  localStorage.removeItem("token")
}
```

---

# 🎯 9. Gestion des erreurs (404)

```jsx
// pages/NotFound.jsx
function NotFound() {
  return <h1>404 - Page non trouvée</h1>
}
```

---

# 🧠 10. Bonnes pratiques

* Séparer router / pages / composants
* Utiliser PrivateRoute pour sécuriser
* Utiliser lazy loading pour performance
* Centraliser la logique auth
* Utiliser Layout + Outlet

---

# ⚡ 11. Résumé rapide

| Concept        | Rôle                 |
| -------------- | -------------------- |
| BrowserRouter  | Active le routing    |
| Routes / Route | Déclare les pages    |
| Link           | Navigation           |
| useNavigate    | Navigation dynamique |
| useParams      | Paramètres URL       |
| Outlet         | Layout imbriqué      |
| PrivateRoute   | Protection           |
| lazy           | Optimisation         |

---

# 🚀 Conclusion

Avec cette structure, tu as :

✔️ Une app scalable
✔️ Une navigation propre
✔️ Une gestion d’auth
✔️ Une performance optimisée

---

👉 Tu peux maintenant connecter ça à :

* API Node.js
* API Spring Boot
* Base PostgreSQL
