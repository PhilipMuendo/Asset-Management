import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { KeyRound, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { changePassword } from "../services/auth";

const changePasswordSchema = z
  .object({
    current_password: z.string().min(1, "Current password is required"),
    new_password: z
      .string()
      .min(8, "New password must be at least 8 characters long")
      .regex(/[A-Z]/, "New password must contain at least one uppercase letter")
      .regex(/[a-z]/, "New password must contain at least one lowercase letter")
      .regex(/[0-9]/, "New password must contain at least one number")
      .regex(/[^A-Za-z0-9]/, "New password must contain at least one special character"),
    confirm_password: z.string().min(1, "Please confirm your new password")
  })
  .refine((data) => data.new_password === data.confirm_password, {
    message: "Passwords do not match",
    path: ["confirm_password"]
  });

type ChangePasswordForm = z.infer<typeof changePasswordSchema>;

export function SettingsPage() {
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const form = useForm<ChangePasswordForm>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      current_password: "",
      new_password: "",
      confirm_password: ""
    }
  });

  const mutation = useMutation({
    mutationFn: changePassword,
    onSuccess: () => {
      setSuccessMsg("Password changed successfully!");
      setErrorMsg(null);
      form.reset();
    },
    onError: (err: any) => {
      setErrorMsg(err.message || "Failed to change password. Please check your current password.");
      setSuccessMsg(null);
    }
  });

  const onSubmit = (data: ChangePasswordForm) => {
    mutation.mutate({
      current_password: data.current_password,
      new_password: data.new_password
    });
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-normal text-slate-950">Account Settings</h1>
        <p className="mt-1 text-sm text-slate-500">
          Manage your account security and update your password.
        </p>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-soft space-y-6">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <div className="p-2 bg-slate-100 rounded-lg text-slate-700">
            <KeyRound size={20} />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-900">Change Password</h2>
            <p className="text-xs text-slate-500">Ensure your account uses a long, random password to stay secure.</p>
          </div>
        </div>

        {successMsg && (
          <div className="flex items-center gap-2.5 rounded-md bg-green-50 p-3.5 text-sm text-green-800 border border-green-200">
            <CheckCircle2 size={16} className="text-green-600 flex-shrink-0" />
            <span className="font-medium">{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="flex items-center gap-2.5 rounded-md bg-red-50 p-3.5 text-sm text-red-800 border border-red-200">
            <AlertCircle size={16} className="text-red-600 flex-shrink-0" />
            <span className="font-medium">{errorMsg}</span>
          </div>
        )}

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">Current Password</label>
            <Input
              type="password"
              placeholder="••••••••"
              className="mt-1.5 max-w-md"
              {...form.register("current_password")}
            />
            {form.formState.errors.current_password && (
              <p className="mt-1.5 text-xs text-red-600">{form.formState.errors.current_password.message}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">New Password</label>
            <Input
              type="password"
              placeholder="••••••••"
              className="mt-1.5 max-w-md"
              {...form.register("new_password")}
            />
            {form.formState.errors.new_password && (
              <p className="mt-1.5 text-xs text-red-600">{form.formState.errors.new_password.message}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">Confirm New Password</label>
            <Input
              type="password"
              placeholder="••••••••"
              className="mt-1.5 max-w-md"
              {...form.register("confirm_password")}
            />
            {form.formState.errors.confirm_password && (
              <p className="mt-1.5 text-xs text-red-600">{form.formState.errors.confirm_password.message}</p>
            )}
          </div>

          <div className="pt-2 border-t border-slate-100 flex justify-start">
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Updating Password..." : "Update Password"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
