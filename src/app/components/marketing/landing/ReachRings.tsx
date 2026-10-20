/**
 * From narrow to broad: one observation in the middle, and the subfield, field
 * and adjacent fields it can reach once its entities carry shared ontology terms.
 * The figure (public/reach-rings.png) is drawn from the same four steps as the
 * cards, which read from the specific study outwards.
 */

const STEPS = [
  {
    role: "Your study", name: "Disease-associated microglia in an Alzheimer's mouse model",
    examples: ["Cell type", "Brain region", "Species", "Disease"],
    how: "Its entities are tagged with shared cell-type, region, species and disease terms when it is ingested.",
  },
  {
    role: "Subfield", name: "Cellular neuroscience",
    examples: ["Microglial activation", "Neuroinflammation", "Synaptic pruning"],
    how: "Linked to other work on the same cell type and biological processes.",
  },
  {
    role: "Field", name: "Neuroscience",
    examples: ["Neurodegeneration", "Amyloid pathology", "Brain aging"],
    how: "Linked through shared disease and pathology concepts.",
  },
  {
    role: "Adjacent fields", name: "Genetics, immunology, neurology",
    examples: ["TREM2 and APOE", "Innate immunity", "Dementia research"],
    how: "Linked through gene, immune-process and disease terms.",
  },
];

export default function ReachRings() {
  return (
    <div className="reach">
      <img
        className="reach-fig"
        src="/reach-rings.png"
        width={700}
        height={700}
        alt="Concentric rings. At the centre, a study of microglia in an Alzheimer's mouse model. The first ring, cellular neuroscience, holds microglial activation, neuroinflammation, synaptic pruning and phagocytosis. The second, neuroscience, holds neural circuits, neurodegeneration, amyloid pathology, memory and brain aging. The outer ring of adjacent fields holds human genetics, immunology, brain imaging, neurology, pharmacology and other disorders such as Parkinson's and MS."
        loading="lazy"
      />
      <div>
        <ol className="reach-list" aria-label="From a specific study to broader fields">
          {STEPS.map((s, i) => (
            <li key={s.role}>
              <span className="n" aria-hidden="true">{String(i + 1).padStart(2, "0")}</span>
              <div className="body">
                <span className="rl">{s.role}</span>
                <span className="nm">{s.name}</span>
                <span className="ex">{s.examples.map((e) => <i key={e}>{e}</i>)}</span>
                <span className="how">{s.how}</span>
              </div>
            </li>
          ))}
        </ol>
        <p className="reach-note">
          The rings show how far a finding can reach, not a strict hierarchy: a study can link straight to genetics or
          another subfield through a shared concept. They are connections BrainKB makes discoverable, backed by
          evidence, not causal claims or a promise that every link is already in the graph.
        </p>
      </div>
    </div>
  );
}
