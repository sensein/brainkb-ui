import Image from "next/image";

export default function PageNotFound() {
	return (
        <main className="flex min-h-screen flex-col items-center justify-center p-24">
            <div className="relative flex flex-col items-center justify-center before:absolute before:h-[300px] before:w-full before:-translate-x-1/2 before:rounded-full before:bg-gradient-radial from-white to-transparent before:blur-2xl before:content-[''] after:absolute after:-z-20 after:h-[180px] after:w-full after:translate-x-1/3 after:bg-gradient-conic from-sky-200 via-blue-200 to-transparent after:blur-2xl after:content-[''] before:dark:bg-gradient-to-br before:dark:from-transparent before:dark:to-blue-700 before:dark:opacity-10 after:dark:from-sky-900 after:dark:via-[#0141ff] after:dark:opacity-40 ">
                <Image
                    className="relative z-10 dark:drop-shadow-[0_0_0.3rem_#ffffff70] dark:invert"
                    src="/brainkb_logo.png"
                    alt="BrainKB Logo"
                    width={180}
                    height={37}
                    priority
                />
            </div>
            <h2 className="mt-8 text-2xl font-semibold text-center">
                Sorry, the requested page does not exist, 404.{" "}
                <span className="inline-block transition-transform group-hover:translate-x-1 motion-reduce:transform-none">
                    {/* Additional content can go here */}
                </span>
            </h2>
        </main>
    );
}