
import {
  createContext,
  useContext,
  useEffect,
  useState
} from "react";

import API from "../api/axios";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("user")) || null;
    } catch {
      return null;
    }
  });

  const [loading, setLoading] = useState(true);

  // RESTORE SESSION
  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      localStorage.removeItem("user");
      setUser(null);
    }

    setLoading(false);
  }, []);

  // ADD JWT TO API REQUESTS
  useEffect(() => {
    const interceptor = API.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem("token");

        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }

        return config;
      },
      (error) => Promise.reject(error)
    );

    return () => {
      API.interceptors.request.eject(interceptor);
    };
  }, []);

  // REGISTER
  // Registration does NOT automatically log in the user.
  const register = async (name, email, password) => {
    const response = await API.post("/auth/register", {
      name,
      email,
      password
    });

    return response.data;
  };

  // LOGIN
  const login = async (email, password) => {
    const response = await API.post("/auth/login", {
      email,
      password
    });

    const { token, user } = response.data;

    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(user));

    setUser(user);

    return response.data;
  };

  // LOGOUT
  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: Boolean(
          user && localStorage.getItem("token")
        ),
        register,
        login,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth must be used inside AuthProvider"
    );
  }

  return context;
};
