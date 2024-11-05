import { Route } from "react-router-dom";
import Layout from "./Layout";
import IndexPage from "./pages/IndexPage/index";
import LoginPage from "./pages/LoginPage/index";
import RegisterPage from "./pages/RegisterPage/index";
import CreatePost from "./pages/CreatePost/index";
import PostPage from "./pages/PostPage/index";
import EditPost from "./pages/EditPost/index";
import Error from "./pages/Error/index";
import PrivateRoute from "./components/ProtectedRoute"; // importe o componente PrivateRoute

const routes = (
    <Route path="/" element={<Layout />}>
        <Route index element={<IndexPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/post/:id" element={<PostPage />} />
        <Route path="*" element={<Error />} />

        {/* Rotas protegidas */}
        <Route element={<PrivateRoute />}>
            <Route path="/create" element={<CreatePost />} />
            <Route path="/edit/:id" element={<EditPost />} />
        </Route>
    </Route>
);

export default routes;
