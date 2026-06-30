import { HashRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import GeneratorAnalysis from './pages/GeneratorAnalysis';
import BidAnalysis from './pages/BidAnalysis';
import RebidTracker from './pages/RebidTracker';
import Trends from './pages/Trends';
import DataStatus from './pages/DataStatus';

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="generators" element={<GeneratorAnalysis />} />
          <Route path="bids" element={<BidAnalysis />} />
          <Route path="rebids" element={<RebidTracker />} />
          <Route path="trends" element={<Trends />} />
          <Route path="status" element={<DataStatus />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
