import AskForm from "./ui/AskForm";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-6 py-16">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">
          Edward Njoroge Kahara
        </h1>
        <a
          href="https://drive.google.com/file/d/1I_I3v9vI3Z1OTwfQuwmksIxUGIpf5sa3/view?usp=sharing"
          target="_blank"
          rel="noopener noreferrer"
          className="w-fit font-medium underline underline-offset-4"
        >
          View resume
        </a>
      </header>
      <AskForm />
    </main>
  );
}
