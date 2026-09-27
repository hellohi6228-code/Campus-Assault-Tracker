// The four separate tracks a campus sexual-assault case can move through. They run independently:
// a case can be closed in criminal court (e.g. no charges) while a civil lawsuit is still active.
window.PROCESS = {
  criminal: {
    label: "Criminal case",
    who: "Police and prosecutors. Can lead to prison. Guilt must be proven beyond a reasonable doubt.",
    steps: [
      ["Report to police", "The survivor or a witness reports to campus or local police."],
      ["Police investigation", "Police gather evidence: interviews, forensic exam, messages, video."],
      ["Charging decision", "The prosecutor files charges, or declines if the evidence is judged insufficient."],
      ["Pretrial", "Arraignment, bail, evidence hearings and plea negotiations."],
      ["Trial or guilty plea", "A jury or judge decides guilt, or the defendant pleads guilty."],
      ["Sentencing", "The judge imposes prison, probation or sex-offender registration."],
      ["Appeals", "The defendant can ask higher courts to overturn the conviction or sentence."]
    ]
  },
  civil: {
    label: "Civil lawsuit",
    who: "Survivors suing individuals or the school for money damages. Decided on a lower standard: more likely than not.",
    steps: [
      ["Complaint filed", "The survivor's lawyers file the lawsuit, often under a pseudonym such as Jane Doe."],
      ["Defendants respond", "The defendants answer the complaint or ask the court to dismiss it."],
      ["Discovery", "Both sides exchange documents and take sworn testimony."],
      ["Settlement or trial", "Most cases settle, often at mediation. The rest go to trial."],
      ["Appeals / payout", "Appeals, or court approval and distribution of a settlement."]
    ]
  },
  campus: {
    label: "Campus (Title IX) process",
    who: "The school's own discipline system. Can expel a student, but cannot send anyone to prison.",
    steps: [
      ["Report to school", "The survivor reports to the Title IX office. Interim protections can start here."],
      ["Investigation", "A school investigator interviews both parties and witnesses."],
      ["Hearing / decision", "A hearing panel or decision-maker decides whether policy was violated."],
      ["Sanctions", "Discipline ranges from warnings to suspension or expulsion."],
      ["Appeal", "Either side can appeal the outcome within the school."]
    ]
  },
  federal: {
    label: "Federal oversight",
    who: "The Education Department (Title IX / Clery Act) or Justice Department reviewing how the school handled reports.",
    steps: [
      ["Complaint or review opened", "A complaint to the Office for Civil Rights, or a Clery Act program review."],
      ["Federal investigation", "Investigators review the school's records, policies and response."],
      ["Findings", "The agency issues findings of violations, or closes the case."],
      ["Fine or agreement", "A Clery fine and/or a resolution agreement requiring reforms."],
      ["Monitoring", "The school reports its progress to the agency until the agreement ends."]
    ]
  }
};
