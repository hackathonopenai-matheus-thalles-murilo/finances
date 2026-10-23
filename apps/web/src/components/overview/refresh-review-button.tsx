import { api } from "@my-better-t-app/backend/convex/_generated/api";
import { Button } from "@my-better-t-app/ui/components/button";
import { useMutation } from "convex/react";
import { RefreshCw } from "lucide-react";
import { useTransition } from "react";

export type RefreshReviewButtonProps = {
  isPreparing: boolean;
};

export function RefreshReviewButton({ isPreparing }: RefreshReviewButtonProps) {
  const refresh = useMutation(api.setup.refresh);
  const [isPending, startTransition] = useTransition();
  const isBusy = isPreparing || isPending;

  function handleClick() {
    startTransition(async () => {
      await refresh({});
    });
  }

  return (
    <Button variant="outline" size="lg" disabled={isBusy} onClick={handleClick}>
      <RefreshCw className={isBusy ? "animate-spin" : undefined} />
      Reanalisar
    </Button>
  );
}
