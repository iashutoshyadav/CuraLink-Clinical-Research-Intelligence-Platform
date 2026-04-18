import React from 'react';
import HomeHero from '../components/home/HomeHero.jsx';
import HomeFeatures from '../components/home/HomeFeatures.jsx';
import Footer from '../components/ui/Footer.jsx';

export default function Home() {
  return (
    <div className="min-h-screen bg-mesh-light bg-noise-light pt-16">
      <HomeHero />
      <HomeFeatures />
      <Footer />
    </div>
  );
}
