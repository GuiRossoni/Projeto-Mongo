import './App.css';
import { Routes } from "react-router-dom";
import { UserContextProvider } from "./components/UserContext";
import routes from './Routes'; // Importa as rotas

function App() {
  return (
    <UserContextProvider>
      <Routes>
        {routes}
      </Routes>
    </UserContextProvider>
  );
}

export default App;
