import React from 'react';

const Profiler = React.unstable_Profiler;

export default function ProfilerComponent({ children, id, isEnabled, timer }) {
  const loggingFunction = (_id, phase, _, baseTime) => {
    timer.updateRenderTimer({ name: _id, value: baseTime });
  };

  if (isEnabled) {
    return (
      <Profiler
        id={id}
        onRender={loggingFunction}
      >
        {children}
      </Profiler>
    );
  }

  return <React.Fragment>{children}</React.Fragment>;
}
