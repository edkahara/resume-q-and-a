import AskForm from "./ui/AskForm";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-6 py-16">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">Resume Q&A</h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          Ask questions about Edward Kahara&apos;s resume. Answers stream in as
          they are generated.
        </p>
        <a
          href="https://drive.google.com/file/d/1YcwmMx0VHUWTa9UGg7hBEy1q_dJJnTXe/view?usp=sharing"
          target="_blank"
          rel="noopener noreferrer"
          className="w-fit font-medium underline underline-offset-4"
        >
          Download the resume
        </a>
      </header>
      <AskForm />
    </main>
  );
}
