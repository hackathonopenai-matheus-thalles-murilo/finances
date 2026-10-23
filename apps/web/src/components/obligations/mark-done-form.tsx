import { api } from "@my-better-t-app/backend/convex/_generated/api";
import type { Id } from "@my-better-t-app/backend/convex/_generated/dataModel";
import { Button } from "@my-better-t-app/ui/components/button";
import { Input } from "@my-better-t-app/ui/components/input";
import { Label } from "@my-better-t-app/ui/components/label";
import { useMutation } from "convex/react";
import { Loader2 } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { todayInSaoPaulo } from "@/lib/format";

const markDoneValues = z.object({ doneOn: z.iso.date(), proof: z.instanceof(File) });

const uploadResult = z.object({
  storageId: z.custom<Id<"_storage">>((value) => typeof value === "string"),
});

async function uploadProof(uploadUrl: string, proof: File) {
  const response = await fetch(uploadUrl, {
    method: "POST",
    headers: { "Content-Type": proof.type },
    body: proof,
  });
  const { storageId } = uploadResult.parse(await response.json());
  return storageId;
}

export type MarkDoneFormProps = {
  obligationId: Id<"obligations">;
};

export function MarkDoneForm({ obligationId }: MarkDoneFormProps) {
  const generateProofUploadUrl = useMutation(api.obligations.generateProofUploadUrl);
  const markDone = useMutation(api.obligations.markDone);
  const [isPending, startTransition] = useTransition();
  const today = todayInSaoPaulo();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const { doneOn, proof } = markDoneValues.parse(
      Object.fromEntries(new FormData(event.currentTarget)),
    );
    startTransition(async () => {
      try {
        const proofId =
          proof.size > 0 ? await uploadProof(await generateProofUploadUrl(), proof) : undefined;
        await markDone({ obligationId, doneOn, proofId });
      } catch {
        toast.error("Não conseguimos marcar como feito. Tente de novo.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full flex-wrap items-end gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="doneOn">Feito em</Label>
        <Input id="doneOn" name="doneOn" type="date" defaultValue={today} max={today} required />
      </div>
      <div className="flex flex-1 flex-col gap-1.5">
        <Label htmlFor="proof">Comprovante ou recibo (opcional)</Label>
        <Input id="proof" name="proof" type="file" accept="application/pdf,image/*" />
      </div>
      <Button type="submit" disabled={isPending}>
        {isPending && <Loader2 className="animate-spin" />}
        {isPending ? "Marcando…" : "Marcar como feito"}
      </Button>
    </form>
  );
}
