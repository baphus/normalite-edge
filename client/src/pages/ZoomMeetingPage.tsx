import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Mic,
    MicOff,
    Video,
    VideoOff,
    Shield,
    Users,
    MessageSquare,
    ScreenShare,
    Smile,
    MoreHorizontal,
    Lock,
    Layout
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const ZoomMeetingPage: React.FC = () => {
    const navigate = useNavigate();
    const [isMuted, setIsMuted] = React.useState(true);
    const [isVideoOff, setIsVideoOff] = React.useState(true);

    const participants = [
        { name: 'Reviewer A', isHost: true, color: 'bg-blue-600', initials: 'RA' },
        { name: 'Maria Clara (You)', color: 'bg-orange-600', initials: 'MC', isYou: true },
        { name: 'Juan Dela Cruz', image: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400&h=225&fit=crop' },
        { name: 'Elena Adarna', image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=225&fit=crop' },
        { name: 'Jose Rizal', color: 'bg-green-700', initials: 'JD' },
        { name: 'Andres Bonifacio', image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=225&fit=crop' },
    ];

    return (
        <div className="h-screen flex flex-col overflow-hidden bg-[#1a1a1a] text-white font-sans">
            {/* Top Bar */}
            <div className="h-12 flex items-center justify-between px-4 bg-[#1a1a1a] shrink-0">
                <div className="flex items-center gap-2">
                    <Lock size={12} className="text-green-500" />
                    <span className="text-[10px] uppercase font-bold tracking-widest text-gray-500">
                        Zoom Meeting | Normalite EDGE Review Session
                    </span>
                </div>
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="sm" className="bg-[#2d2d2d] hover:bg-[#3d3d3d] text-[10px] h-7 px-3 rounded-md uppercase font-bold tracking-widest">
                        <Layout size={12} className="mr-2" /> View
                    </Button>
                </div>
            </div>

            {/* Main Content (Video Grid) */}
            <div className="flex-1 p-6 grid grid-cols-2 md:grid-cols-3 gap-6 overflow-y-auto content-start">
                {participants.map((p, i) => (
                    <div key={i} className={`relative aspect-video rounded-2xl overflow-hidden bg-[#242424] flex items-center justify-center border-2 ${p.isHost ? 'border-primary' : 'border-transparent'}`}>
                        {p.image ? (
                            <img src={p.image} className="w-full h-full object-cover opacity-80" alt={p.name} />
                        ) : (
                            <div className={`w-24 h-24 rounded-full ${p.color} flex items-center justify-center text-3xl font-bold shadow-2xl`}>
                                {p.initials}
                            </div>
                        )}
                        <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center gap-2">
                            {p.isYou ? (isMuted ? <MicOff size={14} className="text-red-500" /> : <Mic size={14} />) : <MicOff size={14} className="text-red-500" />}
                            <span className="text-[10px] font-bold uppercase tracking-widest">
                                {p.name} {p.isHost && '(Host)'}
                            </span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Bottom Controls */}
            <div className="h-24 bg-[#1a1a1a] flex items-center justify-between px-8 shrink-0 border-t border-white/5">
                <div className="flex items-center gap-6">
                    <button
                        onClick={() => setIsMuted(!isMuted)}
                        className="flex flex-col items-center gap-1.5 group"
                    >
                        <div className={`h-12 w-12 flex items-center justify-center rounded-xl transition-all ${isMuted ? 'bg-red-500/10 text-red-500' : 'bg-white/5 text-white hover:bg-white/10'}`}>
                            {isMuted ? <MicOff size={22} /> : <Mic size={22} />}
                        </div>
                        <span className="text-[9px] font-black uppercase tracking-widest text-gray-500 group-hover:text-white transition-colors">
                            {isMuted ? 'Unmute' : 'Mute'}
                        </span>
                    </button>
                    <button
                        onClick={() => setIsVideoOff(!isVideoOff)}
                        className="flex flex-col items-center gap-1.5 group"
                    >
                        <div className={`h-12 w-12 flex items-center justify-center rounded-xl transition-all ${isVideoOff ? 'bg-red-500/10 text-red-500' : 'bg-white/5 text-white hover:bg-white/10'}`}>
                            {isVideoOff ? <VideoOff size={22} /> : <Video size={22} />}
                        </div>
                        <span className="text-[9px] font-black uppercase tracking-widest text-gray-500 group-hover:text-white transition-colors">
                            {isVideoOff ? 'Start Video' : 'Stop Video'}
                        </span>
                    </button>
                </div>

                <div className="flex items-center gap-2">
                    {[
                        { icon: Shield, label: 'Security', color: 'text-emerald-500' },
                        { icon: Users, label: 'Participants', badge: '6' },
                        { icon: MessageSquare, label: 'Chat' },
                        { icon: ScreenShare, label: 'Share', color: 'text-emerald-500' },
                        { icon: Smile, label: 'Reactions' },
                        { icon: MoreHorizontal, label: 'More' },
                    ].map((item, i) => (
                        <button key={i} className="flex flex-col items-center gap-1.5 px-3 py-2 rounded-xl hover:bg-white/5 transition-all group">
                            <div className={`h-10 w-10 flex items-center justify-center relative ${item.color || 'text-gray-400 group-hover:text-white'}`}>
                                <item.icon size={22} />
                                {item.badge && (
                                    <Badge className="absolute -top-1 -right-1 bg-primary text-white text-[9px] h-4 w-4 flex items-center justify-center p-0 border-none">
                                        {item.badge}
                                    </Badge>
                                )}
                            </div>
                            <span className="text-[9px] font-black uppercase tracking-widest text-gray-500 group-hover:text-white transition-colors">
                                {item.label}
                            </span>
                        </button>
                    ))}
                </div>

                <div>
                    <Button
                        onClick={() => navigate(-1)}
                        className="bg-red-600 hover:bg-red-700 text-white font-black px-6 h-11 rounded-xl shadow-lg shadow-red-600/20 uppercase tracking-widest text-xs"
                    >
                        Leave
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default ZoomMeetingPage;
