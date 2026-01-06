import { Spinner } from "@/components/ui/spinner";

export default function Loading() {
    return (
        <div className="h-[calc(100dvh_-_76px)] w-full flex justify-center items-center">
            <Spinner className="size-12" />
        </div>
    )
}
