import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, ExternalLink, MessageCircle, Copy } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { useLinkedInChangelog } from '../../hooks/useLinkedInData';

interface SynergyPartner {
  id: string;
  name: string;
  profileUrl: string;
  avatar: string;
  latestPost?: any;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  lastEngagement: string;
}

export const Synergy = () => {
  const [partners, setPartners] = useState<SynergyPartner[]>([
    {
      id: '1',
      name: 'Sarah Johnson',
      profileUrl: 'https://linkedin.com/in/sarah-johnson',
      avatar: 'https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&dpr=1',
      grade: 'A',
      lastEngagement: '2 days ago'
    },
    {
      id: '2',
      name: 'Michael Chen',
      profileUrl: 'https://linkedin.com/in/michael-chen',
      avatar: 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&dpr=1',
      grade: 'B',
      lastEngagement: '5 days ago'
    }
  ]);

  const [newPartnerUrl, setNewPartnerUrl] = useState('');
  const { data: changelogData } = useLinkedInChangelog();

  const addPartner = () => {
    if (newPartnerUrl.includes('linkedin.com')) {
      // In a real app, would extract profile info from URL
      const newPartner: SynergyPartner = {
        id: Date.now().toString(),
        name: 'New Partner',
        profileUrl: newPartnerUrl,
        avatar: 'https://images.pexels.com/photos/697509/pexels-photo-697509.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&dpr=1',
        grade: 'C',
        lastEngagement: 'Never'
      };
      setPartners([...partners, newPartner]);
      setNewPartnerUrl('');
    }
  };

  const generateComment = (partner: SynergyPartner) => {
    // AI-generated comment suggestions (placeholder)
    const suggestions = [
      "Great insights! This really resonates with my experience in the industry.",
      "Excellent point about market trends. Thanks for sharing your perspective!",
      "This is exactly what I've been thinking about lately. Very timely post!"
    ];
    return suggestions[Math.floor(Math.random() * suggestions.length)];
  };

  const gradeColors = {
    A: 'from-green-500 to-green-600',
    B: 'from-blue-500 to-blue-600',
    C: 'from-yellow-500 to-yellow-600',
    D: 'from-orange-500 to-orange-600',
    F: 'from-red-500 to-red-600'
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Synergy Partners</h2>
        <Button variant="primary">
          <Plus size={20} className="mr-2" />
          Add Partner
        </Button>
      </div>

      {/* Add Partner Form */}
      <Card variant="glass" className="p-6">
        <div className="flex space-x-4">
          <input
            type="url"
            placeholder="Enter LinkedIn profile URL..."
            value={newPartnerUrl}
            onChange={(e) => setNewPartnerUrl(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <Button onClick={addPartner} variant="primary">
            Add Partner
          </Button>
        </div>
      </Card>

      {/* Partners Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {partners.map((partner, index) => (
          <motion.div
            key={partner.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card variant="glass" className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <img
                    src={partner.avatar}
                    alt={partner.name}
                    className="w-12 h-12 rounded-full"
                  />
                  <div>
                    <h3 className="font-semibold">{partner.name}</h3>
                    <p className="text-sm text-gray-500">
                      Last engagement: {partner.lastEngagement}
                    </p>
                  </div>
                </div>
                <div className={`px-3 py-1 rounded-full bg-gradient-to-r ${gradeColors[partner.grade]} text-white font-bold`}>
                  {partner.grade}
                </div>
              </div>

              {/* Latest Post Preview */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-4">
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                  Latest Post:
                </p>
                <p className="text-sm">
                  "Just finished an amazing project with the team. The collaboration and innovation we achieved together was truly inspiring..."
                </p>
                <div className="flex items-center justify-between mt-3">
                  <span className="text-xs text-gray-500">2 days ago</span>
                  <Button variant="ghost" size="sm">
                    <ExternalLink size={16} className="mr-1" />
                    View Post
                  </Button>
                </div>
              </div>

              {/* Comment Suggestions */}
              <div className="space-y-2">
                <p className="text-sm font-medium">AI Comment Suggestions:</p>
                {[1, 2].map((i) => (
                  <div key={i} className="flex items-center space-x-2">
                    <div className="flex-1 p-2 bg-blue-50 dark:bg-blue-900/20 rounded text-sm">
                      {generateComment(partner)}
                    </div>
                    <Button variant="ghost" size="sm">
                      <Copy size={16} />
                    </Button>
                  </div>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-2 mt-4">
                <Button variant="primary" size="sm" className="flex-1">
                  <MessageCircle size={16} className="mr-1" />
                  Engage
                </Button>
                <Button variant="outline" size="sm">
                  Skip
                </Button>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Daily Blitz Report */}
      <Card variant="glass" className="p-6">
        <h3 className="text-lg font-semibold mb-4">Daily Synergy Blitz Report</h3>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {['A', 'B', 'C', 'D', 'F'].map((grade) => (
            <div key={grade} className="text-center">
              <div className={`w-16 h-16 rounded-full bg-gradient-to-r ${gradeColors[grade as keyof typeof gradeColors]} flex items-center justify-center text-white font-bold text-xl mx-auto mb-2`}>
                {grade}
              </div>
              <p className="text-sm text-gray-600">
                {partners.filter(p => p.grade === grade).length} partners
              </p>
            </div>
          ))}
        </div>
      </Card>
    </motion.div>
  );
};