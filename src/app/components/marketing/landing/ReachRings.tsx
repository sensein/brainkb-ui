/**
 * The missing link: one finding (disease-associated microglia at amyloid plaques,
 * Keren-Shaul et al., Cell 2017) and the wider knowledge it connects to. The figure
 * (public/reach-rings.png, drawn from docs/figures/reach-rings.html) tells the story;
 * the rings show reach, not a hierarchy, and each dotted link is a relationship
 * reported in published work, shown as an illustration.
 */
export default function ReachRings() {
  return (
    <div className="missing">
      <div className="missing-copy">
        <span className="missing-k">The missing link</span>
        <h2>From your narrow domain to the whole field</h2>
        <p>
          A study of disease-associated microglia in Alzheimer&apos;s disease begins with a specific cellular
          observation. BrainKB connects it to related knowledge about neuroinflammation, neurodegeneration, genetic
          risk factors and potential therapeutic targets through shared ontology concepts and evidence-linked
          relationships.
        </p>
        <p className="missing-note">
          The rings show how far a finding can reach, not a strict hierarchy. Links are illustrative, drawn from
          published work.
        </p>
      </div>
      <img
        className="missing-fig"
        src="/reach-rings.png"
        width={700}
        height={700}
        loading="lazy"
        alt="Concentric rings around one finding: disease-associated microglia at amyloid plaques in a mouse model. Cellular neuroscience: neuroinflammation, microglial activation, phagocytosis and synaptic pruning. Neuroscience: amyloid pathology, synapse loss and neurodegeneration. Adjacent fields: genetics (TREM2 and APOE risk variants), immunology, drug targets and clinical neurology (Alzheimer's dementia). Dotted lines link each concept to the next."
      />
    </div>
  );
}
