import { Routes, Route } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { SearchPage } from './pages/SearchPage';
import { DetailPage } from './pages/DetailPage';
import { WatchPage } from './pages/WatchPage';
import { Layout } from './components/Layout';

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/detail/:animeName" element={<DetailPage />} />
        <Route path="/watch/:animeName" element={<WatchPage />} />
      </Routes>
    </Layout>
  );
}

export default App;
