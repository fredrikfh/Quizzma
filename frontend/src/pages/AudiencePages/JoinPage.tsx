import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";

const FormSchema = z.object({
  sessionId: z.string().min(4, {
    message: "The session pin must be 4 digits.",
  }),
});

type SchemaProps = z.infer<typeof FormSchema>;

export default function QuizJoinPage() {
  const form = useForm<SchemaProps>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      sessionId: "",
    },
  });

  const navigate = useNavigate();

  /** Redirect to start session and set sessionId as query param */
  const joinSession = (data: SchemaProps) => {
    navigate(`/audience?id=${encodeURIComponent(data.sessionId)}`);
  };

  return (
    <>
      {/* Header */}
      <header className="border-b p-4">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl font-semibold">※ Quizzma</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container max-w-md mx-auto px-4 py-8 flex flex-col justify-center min-h-[calc(100vh-64px)]">
        <div className="w-full space-y-8  text-left">
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(joinSession)}
              className="space-y-6 flex flex-col items-start"
            >
              <FormField
                control={form.control}
                name="sessionId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Session Pin</FormLabel>
                    <FormControl>
                      <InputOTP maxLength={4} {...field}>
                        <InputOTPGroup>
                          <InputOTPSlot index={0} />
                          <InputOTPSlot index={1} />
                          <InputOTPSlot index={2} />
                          <InputOTPSlot index={3} />
                        </InputOTPGroup>
                      </InputOTP>
                    </FormControl>
                    <FormDescription>
                      Enter the 4-digit pin displayed on the teacher's screen.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="">
                Join &rarr;
              </Button>
            </form>
          </Form>
        </div>
      </main>
    </>
  );
}
