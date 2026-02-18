import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, ArcElement, Title, Tooltip, Legend, Filler
);

export const CHART_COLORS = ['#FF6B2C', '#00D4AA', '#8B5CF6', '#FF6B8A', '#EAB308', '#06B6D4'];

function getCSSVar(name: string, fallback: string): string {
  if (typeof document === 'undefined') return fallback;
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

export function getChartOptions() {
  const textMuted = getCSSVar('--text-muted', '#5E5E78');
  const textSecondary = getCSSVar('--text-secondary', '#A8A8C0');
  const card = getCSSVar('--card', '#141425');
  const border = getCSSVar('--border', '#252540');
  const textPrimary = getCSSVar('--text-primary', '#F5F5F7');

  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: { color: textSecondary, font: { family: 'Inter', size: 11 } },
      },
      tooltip: {
        backgroundColor: card,
        titleColor: textPrimary,
        bodyColor: textSecondary,
        borderColor: border,
        borderWidth: 1,
        cornerRadius: 8,
        padding: 10,
      },
    },
    scales: {
      x: {
        ticks: { color: textMuted, font: { size: 10 } },
        grid: { color: border + '40' },
      },
      y: {
        ticks: { color: textMuted, font: { size: 10 } },
        grid: { color: border + '40' },
      },
    },
  };
}

// Static fallback for SSR or initial render
export const defaultChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      labels: { color: '#A8A8C0', font: { family: 'Inter', size: 11 } },
    },
    tooltip: {
      backgroundColor: '#141425',
      titleColor: '#F5F5F7',
      bodyColor: '#A8A8C0',
      borderColor: '#252540',
      borderWidth: 1,
      cornerRadius: 8,
      padding: 10,
    },
  },
  scales: {
    x: {
      ticks: { color: '#5E5E78', font: { size: 10 } },
      grid: { color: '#25254040' },
    },
    y: {
      ticks: { color: '#5E5E78', font: { size: 10 } },
      grid: { color: '#25254040' },
    },
  },
};
