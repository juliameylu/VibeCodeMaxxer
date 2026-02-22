import { RouterProvider } from 'react-router';
import { router } from './routes';
import { useState, useEffect } from 'react';
import { AnimatePresence } from 'motion/react';
import { MorroBayWaveLoading } from './components/MorroBayWaveLoading';

export default function App() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initial load simulation
    const timer = setTimeout(() => {
      setLoading(false);
    }, 2800); // Allow time for wave animation
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <AnimatePresence mode="wait">
        {loading && (
          <MorroBayWaveLoading key="loading" onComplete={() => setLoading(false)} />
        )}
      </AnimatePresence>
      {!loading && <RouterProvider router={router} />}
    </>
  );
}
