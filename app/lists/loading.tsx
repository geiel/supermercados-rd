import { Spinner } from "@/components/ui/spinner";

export default function Loading() {
    return (
        <div className="h-[calc(100dvh_-_70px)] w-full flex justify-center items-center">
            <Spinner className="size-12" />
        </div>
    )
}
