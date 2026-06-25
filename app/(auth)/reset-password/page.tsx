import { Building2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { APP_NAME } from "@/lib/constants";
import { ResetPasswordForm } from "@/components/domain/auth/reset-password-form";

export const metadata = { title: "Redefinir senha" };

export default function ResetPasswordPage() {
  return (
    <div className="grid min-h-dvh place-items-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-3 grid size-14 place-items-center rounded-2xl bg-primary text-primary-foreground">
            <Building2 className="size-7" />
          </div>
          <h1 className="text-2xl font-bold">{APP_NAME}</h1>
          <p className="mt-1 text-sm text-muted-foreground">Defina sua nova senha</p>
        </div>

        <Card>
          <CardContent className="pt-6">
            <ResetPasswordForm />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
