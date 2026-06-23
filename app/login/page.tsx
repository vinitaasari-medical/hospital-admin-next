'use client';
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { apiClient } from "@/lib/api/apiClient";
import type { LoginResponseData } from "@/hooks/useAuth";

const getOrCreateDeviceId = (): string => {
  let deviceId = localStorage.getItem("device_id");
  if (!deviceId) {
    deviceId = crypto.randomUUID();
    localStorage.setItem("device_id", deviceId);
  }
  return deviceId;
};

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [hospitalId, setHospitalId] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loginError, setLoginError] = useState("");
  const router = useRouter();
  const { getUserId, setUser } = useAuth();

  useEffect(() => {
    if (getUserId()) {
      router.replace("/admin");
    }
  }, []);

  if (typeof window !== "undefined" && getUserId()) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password || !hospitalId) {
      setLoginError("Please fill in all fields.");
      return;
    }

    setLoginError("");
    setIsLoading(true);

    try {
      const deviceId = getOrCreateDeviceId();

      const result = (await apiClient("POST", "admin", "unauth/hospitaladminlogin", {
        body: { email, password, hospital_id: hospitalId, device_id: deviceId },
        shouldUseDefaultToken: true,
        enableLogging: true,
      })) as { content: { data: LoginResponseData } };

      const { data } = result.content;

      window.localStorage.setItem("device_id", deviceId);

      if (data.admin_type === "department") {
        window.localStorage.setItem("subnetworks_departments", "true");
        window.localStorage.setItem("cluster_id", data.cluster_id);
        window.localStorage.setItem("sub", "true");
        window.localStorage.setItem("network_id", data.subnetworks[0].id);
        window.localStorage.setItem("network_name", data.subnetworks[0].name);
        window.localStorage.setItem("network_profile", data.subnetworks[0].profile_url || "");
        window.localStorage.setItem("is_cluster_admin", "false");
      }

      if (data.subnetworks_departments) {
        const values = Object.values(data.subnetworks_departments);
        if (values.length > 0 && values[0].length > 0) {
          window.localStorage.setItem("dep", "true");
        }
      }

      if (data.admin_type === "subnetwork" || data.is_single_subnetwork_cluster) {
        window.localStorage.setItem("is_single", String(data.is_single_subnetwork_cluster));
        window.localStorage.setItem("cluster_id", data.cluster_id);
        window.localStorage.setItem("sub", "true");
        window.localStorage.setItem("network_id", data.subnetworks[0].id);
        window.localStorage.setItem("network_name", data.subnetworks[0].name);
        window.localStorage.setItem("network_profile", data.subnetworks[0].profile_url || "");
        window.localStorage.setItem("is_cluster_admin", "false");
      }

      if (data.admin_type === "cluster") {
        window.localStorage.setItem("network_name", data.cluster_name);
        window.localStorage.setItem("cluster_profile_url", data.cluster_profile_url);
        window.localStorage.setItem("is_cluster_admin", "true");
        // Cache the subnetwork list from the login response so the sidebar can
        // render immediately without waiting for the listclustersubnetworks API call.
        window.localStorage.setItem(
          "networkData",
          JSON.stringify(
            data.subnetworks.map((n) => ({
              id: n.id,
              name: n.name,
              profile_url: n.profile_url ?? "",
            }))
          )
        );
      }

      window.localStorage.setItem("cluster_id", data.cluster_id);

      setUser(data);

      const path =
        localStorage.getItem("subnetworks_departments") === "true"
          ? "/admin/departments"
          : "/admin";

      window.location.href = path;
    } catch (error: unknown) {
      const err = error as { message?: string; userMessage?: string };
      setLoginError(err.userMessage || err.message || "Login failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 gradient-primary items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full border border-secondary/30"
              style={{
                width: `${200 + i * 120}px`,
                height: `${200 + i * 120}px`,
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
              }}
            />
          ))}
        </div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative z-10 text-center max-w-md"
        >
          <div className="flex items-center justify-center mb-8">
            <img src="/logo.png" alt="MedicalCircles" className="h-12 object-contain" />
          </div>
          <p className="text-sidebar-foreground text-lg leading-relaxed">
            Empowering healthcare collaboration through connected networks and seamless communication.
          </p>
        </motion.div>
      </div>

      {/* Right panel - login form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="w-full max-w-sm"
        >
          <div className="lg:hidden flex items-center justify-center mb-8">
            <img src="/logo.png" alt="MedicalCircles" className="h-10 object-contain" />
          </div>

          <h2 className="text-2xl font-semibold text-foreground mb-1">Welcome back</h2>
          <p className="text-muted-foreground mb-8">Sign in to your dashboard</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-3">
              <Label>Email</Label>
              <Input
                type="email"
                placeholder="name@hospital.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setLoginError(""); }}
                className="h-11"
              />
            </div>

            <div className="space-y-3">
              <Label>Password</Label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setLoginError(""); }}
                  className="h-11 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <Label>Organisation ID</Label>
              <Input
                type="text"
                placeholder="Enter your organisation ID"
                value={hospitalId}
                onChange={(e) => { setHospitalId(e.target.value); setLoginError(""); }}
                className="h-11"
              />
            </div>

            {loginError && (
              <p className="text-sm text-destructive">{loginError}</p>
            )}

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 bg-secondary text-secondary-foreground hover:bg-secondary/90 shadow-accent font-medium"
            >
              {isLoading ? "Signing in..." : "Sign in"}
            </Button>
          </form>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;
