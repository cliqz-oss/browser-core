import React from 'react';

export default function Dots({
  currentStep,
  stepsState,
  updateCurrentStep,
}) {
  function getClassName(step, index) {
    let className = 'disabled';
    if (step.visited) {
      if (step.enabled) {
        className = 'enabled';
      } else {
        className = 'visited';
      }
    }

    if (currentStep === index) {
      className = `${className} current`;
    }

    return className;
  }

  return (
    <div className="dots">
      {stepsState.map((step, index) => (
        <button
          type="button"
          key={`step-${step.name}`}
          onClick={() => updateCurrentStep(index)}
          className={getClassName(step, index)}
        />
      ))}
    </div>
  );
}
