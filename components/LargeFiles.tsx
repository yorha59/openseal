
import React, { useState } from 'react';
import { Treemap, ResponsiveContainer, Tooltip } from 'recharts';
import { File, HardDrive, Download, Video, Music, Image as ImageIcon, ExternalLink, Trash2 } from 'lucide-react';

const LargeFiles: React.FC = () => {
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);

  const fileData = [
    {
      name: 'Media',
      children: [
        { name: 'Vacation Movie.mp4', size: 4500, type: 'video' },
        { name: '4K Drone Footage.mov', size: 12000, type: 'video' },
        { name: 'Podcast Recording.wav', size: 850, type: 'audio' },
      ],
    },
    {
      name: 'Downloads',
      children: [
        { name: 'macOS_Installer.pkg', size: 14500, type: 'binary' },
        { name: 'Game Assets.zip', size: 3200, type: 'archive' },
      ],
    },
    {
      name: 'Design',
      children: [
        { name: 'Project_Final.psd', size: 1200, type: 'image' },
        { name: 'Landing_Page.sketch', size: 450, type: 'image' },
      ],
    },
  ];

  const flattenedFiles = fileData.flatMap(folder => 
    folder.children.map(file => ({ ...file, folder: folder.name }))
  ).sort((a, b) => b.size - a.size);

  const formatSize = (mb: number) => {
    return mb > 1000 ? `${(mb / 1024).toFixed(2)} GB` : `${mb} MB`;
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'video': return <Video size={16} />;
      case 'audio': return <Music size={16} />;
      case 'image': return <ImageIcon size={16} />;
      case 'binary': return <HardDrive size={16} />;
      case 'archive': return <Download size={16} />;
      default: return <File size={16} />;
    }
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 rounded-lg shadow-xl border border-gray-100 text-xs">
          <p className="font-bold mb-1">{data.name}</p>
          <p className="text-gray-500">Size: {formatSize(data.size)}</p>
          <p className="text-gray-500">Location: {data.folder}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Visualization */}
        <div className="lg:col-span-2 glass rounded-3xl p-8 flex flex-col h-[500px]">
          <h3 className="text-lg font-bold mb-6">Space Distribution</h3>
          <div className="flex-1 w-full min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <Treemap
                data={fileData}
                dataKey="size"
                aspectRatio={4 / 3}
                stroke="#fff"
                fill="#3b82f6"
              >
                <Tooltip content={<CustomTooltip />} />
              </Treemap>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center space-x-4 mt-6">
             <div className="flex items-center space-x-1.5"><div className="w-3 h-3 bg-blue-500 rounded-sm"></div><span className="text-xs text-gray-500">Video</span></div>
             <div className="flex items-center space-x-1.5"><div className="w-3 h-3 bg-blue-400 rounded-sm"></div><span className="text-xs text-gray-500">Installers</span></div>
             <div className="flex items-center space-x-1.5"><div className="w-3 h-3 bg-blue-300 rounded-sm"></div><span className="text-xs text-gray-500">Other</span></div>
          </div>
        </div>

        {/* List */}
        <div className="glass rounded-3xl p-6 flex flex-col">
          <h3 className="text-lg font-bold mb-4">Top 10 Largest Files</h3>
          <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-gray-200">
            {flattenedFiles.map((file, i) => (
              <div key={i} className="group p-3 bg-white hover:bg-blue-50 border border-gray-100 rounded-xl transition-all cursor-pointer">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-gray-50 group-hover:bg-blue-100 text-gray-400 group-hover:text-blue-600 rounded-lg transition-colors">
                      {getIcon(file.type)}
                    </div>
                    <div className="max-w-[120px]">
                      <div className="font-semibold text-sm truncate">{file.name}</div>
                      <div className="text-[10px] text-gray-400 font-medium uppercase">{file.folder}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-bold text-gray-700">{formatSize(file.size)}</div>
                    <div className="flex items-center justify-end space-x-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="p-1 hover:text-blue-500"><ExternalLink size={14} /></button>
                      <button className="p-1 hover:text-red-500"><Trash2 size={14} /></button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <button className="mt-4 w-full py-3 border border-gray-200 text-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors">
            Scan External Drive
          </button>
        </div>
      </div>
    </div>
  );
};

export default LargeFiles;
