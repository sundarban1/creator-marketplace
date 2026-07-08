export type UserStatus = 'active' | 'inactive' | 'banned';
export type CampaignStatus = 'active' | 'pending' | 'completed' | 'cancelled';
export type PaymentStatus = 'paid' | 'pending' | 'failed' | 'refunded';
export type ReportStatus = 'open' | 'reviewing' | 'resolved' | 'dismissed';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'creator' | 'business' | 'admin';
  status: UserStatus;
  joinedAt: string;
  avatar: string;
}

export interface Creator {
  id: string;
  name: string;
  handle: string;
  avatar: string;
  platform: string;
  followers: string;
  engagement: string;
  category: string;
  status: UserStatus;
  campaigns: number;
  earnings: string;
}

export interface Business {
  id: string;
  name: string;
  email: string;
  industry: string;
  status: UserStatus;
  campaigns: number;
  spent: string;
  joinedAt: string;
  logo: string;
}

export interface Campaign {
  id: string;
  title: string;
  business: string;
  platform: string;
  budget: string;
  status: CampaignStatus;
  proposals: number;
  deadline: string;
  category: string;
}

export interface Payment {
  id: string;
  from: string;
  to: string;
  amount: string;
  status: PaymentStatus;
  date: string;
  method: string;
  campaign: string;
}

export interface Report {
  id: string;
  reporter: string;
  reported: string;
  reason: string;
  status: ReportStatus;
  date: string;
  description: string;
}

export const dashboardStats = {
  totalUsers: 12_847,
  totalCreators: 4_231,
  totalBusinesses: 1_089,
  activeCampaigns: 342,
  totalRevenue: '$284,920',
  pendingPayments: 47,
  recentReports: 18,
  monthlyGrowth: '+14.2%',
};

export const recentActivity = [
  { id: '1', type: 'new_user', text: 'Alex Rivera joined as Creator', time: '2 min ago', icon: 'user' },
  { id: '2', type: 'campaign', text: 'StyleCo launched "Summer Collection" event', time: '15 min ago', icon: 'campaign' },
  { id: '3', type: 'payment', text: 'Payment of $1,200 released to @fashionista', time: '1 hr ago', icon: 'payment' },
  { id: '4', type: 'report', text: 'New report filed against @spamuser123', time: '2 hr ago', icon: 'report' },
  { id: '5', type: 'campaign', text: 'TechGadgets event marked as completed', time: '3 hr ago', icon: 'campaign' },
  { id: '6', type: 'new_user', text: 'NovaBrands Inc. joined as Business', time: '5 hr ago', icon: 'user' },
  { id: '7', type: 'payment', text: 'Payment of $850 released to @travelblogger', time: '6 hr ago', icon: 'payment' },
];

export const users: User[] = [
  { id: 'u1', name: 'Alex Rivera', email: 'alex@example.com', role: 'creator', status: 'active', joinedAt: '2024-01-12', avatar: 'AR' },
  { id: 'u2', name: 'StyleCo Brand', email: 'hello@styleco.com', role: 'business', status: 'active', joinedAt: '2024-01-15', avatar: 'SC' },
  { id: 'u3', name: 'Mia Chen', email: 'mia@example.com', role: 'creator', status: 'active', joinedAt: '2024-02-03', avatar: 'MC' },
  { id: 'u4', name: 'TechGadgets Inc.', email: 'info@techgadgets.com', role: 'business', status: 'inactive', joinedAt: '2024-02-10', avatar: 'TG' },
  { id: 'u5', name: 'Jordan Blake', email: 'jordan@example.com', role: 'creator', status: 'banned', joinedAt: '2024-02-18', avatar: 'JB' },
  { id: 'u6', name: 'NovaBrands Inc.', email: 'contact@novabrands.com', role: 'business', status: 'active', joinedAt: '2024-03-01', avatar: 'NB' },
  { id: 'u7', name: 'Priya Sharma', email: 'priya@example.com', role: 'creator', status: 'active', joinedAt: '2024-03-08', avatar: 'PS' },
  { id: 'u8', name: 'FoodieHub Co.', email: 'team@foodiehub.com', role: 'business', status: 'active', joinedAt: '2024-03-15', avatar: 'FH' },
  { id: 'u9', name: 'Tyler James', email: 'tyler@example.com', role: 'creator', status: 'inactive', joinedAt: '2024-03-22', avatar: 'TJ' },
  { id: 'u10', name: 'UrbanWear Ltd.', email: 'admin@urbanwear.com', role: 'business', status: 'active', joinedAt: '2024-04-01', avatar: 'UW' },
];

export const creators: Creator[] = [
  { id: 'c1', name: 'Alex Rivera', handle: '@alexrivera', avatar: 'AR', platform: 'Instagram', followers: '142K', engagement: '4.8%', category: 'Fashion', status: 'active', campaigns: 12, earnings: '$8,400' },
  { id: 'c2', name: 'Mia Chen', handle: '@miachen', avatar: 'MC', platform: 'TikTok', followers: '890K', engagement: '6.2%', category: 'Lifestyle', status: 'active', campaigns: 24, earnings: '$21,300' },
  { id: 'c3', name: 'Jordan Blake', handle: '@jordanblake', avatar: 'JB', platform: 'YouTube', followers: '320K', engagement: '3.1%', category: 'Tech', status: 'banned', campaigns: 5, earnings: '$3,200' },
  { id: 'c4', name: 'Priya Sharma', handle: '@priyasharma', avatar: 'PS', platform: 'Instagram', followers: '75K', engagement: '7.4%', category: 'Beauty', status: 'active', campaigns: 9, earnings: '$5,100' },
  { id: 'c5', name: 'Tyler James', handle: '@tylerjames', avatar: 'TJ', platform: 'YouTube', followers: '215K', engagement: '2.9%', category: 'Fitness', status: 'inactive', campaigns: 3, earnings: '$1,800' },
  { id: 'c6', name: 'Sofia Ruiz', handle: '@sofiaruiz', avatar: 'SR', platform: 'TikTok', followers: '1.2M', engagement: '8.1%', category: 'Food', status: 'active', campaigns: 31, earnings: '$44,700' },
  { id: 'c7', name: 'Marcus Lee', handle: '@marcuslee', avatar: 'ML', platform: 'Instagram', followers: '67K', engagement: '5.6%', category: 'Travel', status: 'active', campaigns: 7, earnings: '$4,200' },
  { id: 'c8', name: 'Aisha Khan', handle: '@aishakhan', avatar: 'AK', platform: 'LinkedIn', followers: '28K', engagement: '9.3%', category: 'Business', status: 'active', campaigns: 4, earnings: '$3,600' },
];

export const businesses: Business[] = [
  { id: 'b1', name: 'StyleCo Brand', email: 'hello@styleco.com', industry: 'Fashion', status: 'active', campaigns: 8, spent: '$32,400', joinedAt: '2024-01-15', logo: 'SC' },
  { id: 'b2', name: 'TechGadgets Inc.', email: 'info@techgadgets.com', industry: 'Technology', status: 'inactive', campaigns: 3, spent: '$9,800', joinedAt: '2024-02-10', logo: 'TG' },
  { id: 'b3', name: 'NovaBrands Inc.', email: 'contact@novabrands.com', industry: 'Retail', status: 'active', campaigns: 12, spent: '$58,200', joinedAt: '2024-03-01', logo: 'NB' },
  { id: 'b4', name: 'FoodieHub Co.', email: 'team@foodiehub.com', industry: 'Food & Beverage', status: 'active', campaigns: 6, spent: '$17,500', joinedAt: '2024-03-15', logo: 'FH' },
  { id: 'b5', name: 'UrbanWear Ltd.', email: 'admin@urbanwear.com', industry: 'Fashion', status: 'active', campaigns: 15, spent: '$71,300', joinedAt: '2024-04-01', logo: 'UW' },
  { id: 'b6', name: 'GreenLife Corp.', email: 'info@greenlife.com', industry: 'Health & Wellness', status: 'active', campaigns: 5, spent: '$14,900', joinedAt: '2024-04-12', logo: 'GL' },
  { id: 'b7', name: 'AutoParts Pro', email: 'sales@autopartspro.com', industry: 'Automotive', status: 'banned', campaigns: 1, spent: '$2,100', joinedAt: '2024-04-20', logo: 'AP' },
];

export const campaigns: Campaign[] = [
  { id: 'cp1', title: 'Summer Collection Launch', business: 'StyleCo Brand', platform: 'Instagram', budget: '$5,000', status: 'active', proposals: 18, deadline: '2024-07-30', category: 'Fashion' },
  { id: 'cp2', title: 'Tech Review Series', business: 'TechGadgets Inc.', platform: 'YouTube', budget: '$3,200', status: 'completed', proposals: 7, deadline: '2024-06-15', category: 'Technology' },
  { id: 'cp3', title: 'Back to School Campaign', business: 'NovaBrands Inc.', platform: 'TikTok', budget: '$8,500', status: 'active', proposals: 34, deadline: '2024-08-20', category: 'Retail' },
  { id: 'cp4', title: 'Foodie Friday Challenge', business: 'FoodieHub Co.', platform: 'Instagram', budget: '$2,800', status: 'pending', proposals: 0, deadline: '2024-08-01', category: 'Food' },
  { id: 'cp5', title: 'Urban Street Style', business: 'UrbanWear Ltd.', platform: 'Instagram', budget: '$12,000', status: 'active', proposals: 52, deadline: '2024-09-01', category: 'Fashion' },
  { id: 'cp6', title: 'Wellness Wednesday', business: 'GreenLife Corp.', platform: 'YouTube', budget: '$4,100', status: 'active', proposals: 14, deadline: '2024-08-15', category: 'Health' },
  { id: 'cp7', title: 'Holiday Gift Guide', business: 'NovaBrands Inc.', platform: 'TikTok', budget: '$15,000', status: 'pending', proposals: 0, deadline: '2024-11-01', category: 'Retail' },
  { id: 'cp8', title: 'Fitness Challenge 30', business: 'GreenLife Corp.', platform: 'YouTube', budget: '$6,000', status: 'cancelled', proposals: 9, deadline: '2024-07-01', category: 'Health' },
];

export const payments: Payment[] = [
  { id: 'py1', from: 'StyleCo Brand', to: 'Alex Rivera', amount: '$1,200', status: 'paid', date: '2024-06-10', method: 'Bank Transfer', campaign: 'Summer Collection Launch' },
  { id: 'py2', from: 'NovaBrands Inc.', to: 'Mia Chen', amount: '$2,800', status: 'paid', date: '2024-06-09', method: 'PayPal', campaign: 'Back to School Campaign' },
  { id: 'py3', from: 'TechGadgets Inc.', to: 'Jordan Blake', amount: '$950', status: 'failed', date: '2024-06-08', method: 'Bank Transfer', campaign: 'Tech Review Series' },
  { id: 'py4', from: 'UrbanWear Ltd.', to: 'Sofia Ruiz', amount: '$4,500', status: 'pending', date: '2024-06-07', method: 'Stripe', campaign: 'Urban Street Style' },
  { id: 'py5', from: 'FoodieHub Co.', to: 'Priya Sharma', amount: '$800', status: 'paid', date: '2024-06-06', method: 'PayPal', campaign: 'Foodie Friday Challenge' },
  { id: 'py6', from: 'GreenLife Corp.', to: 'Marcus Lee', amount: '$1,650', status: 'paid', date: '2024-06-05', method: 'Stripe', campaign: 'Wellness Wednesday' },
  { id: 'py7', from: 'UrbanWear Ltd.', to: 'Aisha Khan', amount: '$2,200', status: 'refunded', date: '2024-06-04', method: 'Bank Transfer', campaign: 'Urban Street Style' },
  { id: 'py8', from: 'StyleCo Brand', to: 'Tyler James', amount: '$600', status: 'pending', date: '2024-06-03', method: 'PayPal', campaign: 'Summer Collection Launch' },
];

export const reports: Report[] = [
  { id: 'r1', reporter: 'Alex Rivera', reported: 'spamuser123', reason: 'Spam / Fake Account', status: 'open', date: '2024-06-10', description: 'This account is sending unsolicited DMs promoting fake gigs.' },
  { id: 'r2', reporter: 'NovaBrands Inc.', reported: 'Jordan Blake', reason: 'Fraudulent Activity', status: 'reviewing', date: '2024-06-09', description: 'Creator submitted fake engagement stats in the proposal.' },
  { id: 'r3', reporter: 'Mia Chen', reported: 'AutoParts Pro', reason: 'Misleading Event', status: 'resolved', date: '2024-06-07', description: 'Event brief was completely different from what was agreed upon.' },
  { id: 'r4', reporter: 'Priya Sharma', reported: 'fakeinfluencer99', reason: 'Spam / Fake Account', status: 'dismissed', date: '2024-06-05', description: 'Account appears to have purchased followers.' },
  { id: 'r5', reporter: 'FoodieHub Co.', reported: 'Tyler James', reason: 'Content Violation', status: 'open', date: '2024-06-04', description: 'Creator posted content that violated agreed brand guidelines.' },
  { id: 'r6', reporter: 'Sofia Ruiz', reported: 'scambrand2024', reason: 'Payment Fraud', status: 'reviewing', date: '2024-06-03', description: 'Business refused to pay after content was delivered and approved.' },
];
