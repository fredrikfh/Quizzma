import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button, ButtonProps } from "@/components/ui/button.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog.tsx";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form.tsx";
import { Input } from "@/components/ui/input.tsx";
import { toast } from "sonner";
import useAuth from "@/contexts/useAuth.ts";
import { Key, User, Loader, AlertCircle } from "lucide-react";
import { FirebaseError } from "firebase/app";
import { Alert, AlertDescription } from "./ui/alert.tsx";
import { AlertTitle } from "@/components/ui/alert.tsx";

/**
 * Define a base schema.
 * For signup, you could add optional fields like confirmPassword or username,
 * or create separate schemas for login vs signup.
 */
const formSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }),
  password: z
    .string()
    .min(6, { message: "Password must be at least 6 characters." }),
});

interface LoginPopupProps {
  /** Props to pass to the login/signup trigger button. */
  buttonProps?: Partial<ButtonProps>;
}

/**
 * Helper function to map Firebase error codes to user-friendly messages.
 */
function getFirebaseErrorMessage(error: FirebaseError): string {
  switch (error.code) {
    case "auth/invalid-email":
      return "The email address is not valid.";
    case "auth/user-disabled":
      return "This user account has been disabled.";
    case "auth/user-not-found":
      return "No user found with this email.";
    case "auth/wrong-password":
      return "Incorrect password.";
    case "auth/email-already-in-use":
      return "This email is already in use.";
    case "auth/weak-password":
      return "The password is too weak.";
    case "auth/network-request-failed":
      return "Internet connection issues. Try again.";
    case "auth/invalid-credential":
      return "Invalid credentials. Please try again.";
    default:
      return error.message;
  }
}

/**
 * Helper function to extract an error message and assign it to a field or as a generic form error.
 */
function extractFirebaseFieldError(error: unknown): {
  field: "email" | "password" | "form";
  message: string;
} {
  let field: "email" | "password" | "form" = "form";
  let message = "Something went wrong.";

  if (error instanceof FirebaseError) {
    switch (error.code) {
      case "auth/invalid-email":
      case "auth/email-already-in-use":
      case "auth/user-not-found":
        field = "email";
        message = getFirebaseErrorMessage(error);
        break;
      case "auth/wrong-password":
        field = "password";
        message = getFirebaseErrorMessage(error);
        break;
      default:
        message = getFirebaseErrorMessage(error);
        break;
    }
  } else if (error && typeof error === "object") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const errObj = error as any;
    if (errObj.error && errObj.error.message) {
      switch (errObj.error.message) {
        case "EMAIL_EXISTS":
          field = "email";
          message = "This email is already in use.";
          break;
        case "INVALID_EMAIL":
          field = "email";
          message = "The email address is not valid.";
          break;
        case "USER_NOT_FOUND":
          field = "email";
          message = "No user found with this email.";
          break;
        case "WRONG_PASSWORD":
          field = "password";
          message = "Incorrect password.";
          break;
        default:
          message = errObj.error.message;
      }
    } else if (errObj.message) {
      message = errObj.message;
    }
  }

  return { field, message };
}

export function LoginPopup({ buttonProps }: LoginPopupProps) {
  const [open, setOpen] = useState(false);
  const [isSignup, setIsSignup] = useState(false);
  const [guestLoading, setGuestLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const { login, signup, anonymousLogin } = useAuth();

  // Our form setup using a single schema for both modes
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    // Clear any previous form-level errors
    setFormError(null);
    toast.loading(isSignup ? "Creating account..." : "Logging in...");
    try {
      if (isSignup) {
        await signup(values.email, values.password);
        toast.success("Account created! You are now logged in.");
      } else {
        await login(values.email, values.password);
        toast.success("Logged in successfully");
      }
      setOpen(false);
    } catch (error: unknown) {
      const { field, message } = extractFirebaseFieldError(error);
      if (field === "form") {
        setFormError(message);
      } else {
        form.setError(field, { message });
      }
      toast.error(message);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {/* Use <DialogTrigger asChild> for a custom button/trigger */}
      <DialogTrigger asChild>
        <Button variant="outline" {...buttonProps}>
          {/* fallback text if none provided */}
          {buttonProps?.children ?? (isSignup ? "Sign Up" : "Login")}
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isSignup ? "Sign Up" : "Login"}</DialogTitle>
          <DialogDescription>
            {/* Toggle between signup & login */}
            <p className="text-sm text-gray-500">
              {isSignup ? "Already have an account?" : "Don't have an account?"}{" "}
              <Button
                variant="link"
                className="p-0 h-auto text-blue-600 hover:underline"
                onClick={() => {
                  setIsSignup(!isSignup);
                  setFormError(null);
                  form.clearErrors();
                }}
              >
                {isSignup ? "Login" : "Sign Up"}
              </Button>
            </p>
          </DialogDescription>
        </DialogHeader>

        {/* Display a form-level error if one exists */}
        {formError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Email Field */}
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="you@example.com"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Password Field */}
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="Enter your password"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <div className="flex flex-col gap-2 w-full pt-4">
                <Button
                  type="submit"
                  className="w-full flex items-center justify-center"
                >
                  <Key className="mr-2" />
                  {isSignup ? "Sign Up" : "Login"}
                </Button>
                {!isSignup && (
                  <Button
                    variant="secondary"
                    className="w-full flex items-center justify-center"
                    disabled={guestLoading}
                    onClick={async () => {
                      setGuestLoading(true);
                      setFormError(null);
                      form.clearErrors();
                      try {
                        toast.loading("Signing in anonymously...");
                        await anonymousLogin();
                        toast.success("Signed in as guest");
                        setOpen(false);
                      } catch (error: unknown) {
                        const { field, message } =
                          extractFirebaseFieldError(error);
                        if (field === "form") {
                          setFormError(message);
                        } else {
                          form.setError(field, { message });
                        }
                        toast.error(message);
                      } finally {
                        setGuestLoading(false);
                      }
                    }}
                  >
                    {guestLoading ? (
                      <Loader className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <User className="mr-2" />
                    )}
                    Continue as Guest
                  </Button>
                )}
              </div>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
