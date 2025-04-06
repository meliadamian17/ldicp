import LargestInscribedDisk from "./interactive";

export default function Home() {
  return (
    <div className="flex flex-col items-center py-16">
      <h1 className="text-4xl font-bold pb-8">CSCC73 Presentation | Largest Disk in a Convex Polygon</h1>
      <p className="text-xl">
        Damian Melia & Krit Grover
      </p>
      <LargestInscribedDisk />
    </div>
  );
}
