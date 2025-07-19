'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowRight, 
  CheckCircle, 
  FileText, 
  Calendar, 
  Users, 
  Shield, 
  Zap, 
  Clock,
  BarChart3,
  Star,
  Play,
  Quote,
  Award,
  TrendingUp,
  Smartphone,
  Lock,
  Globe,
  Building,
  Target,
  Briefcase
} from 'lucide-react';

export default function AnimatedHomePage() {
  return (
    <>
      {/* Add custom CSS for animations */}
      <style jsx global>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        
        @keyframes slideInLeft {
          0% { transform: translateX(-100px); opacity: 0; }
          100% { transform: translateX(0); opacity: 1; }
        }
        
        @keyframes slideInRight {
          0% { transform: translateX(100px); opacity: 0; }
          100% { transform: translateX(0); opacity: 1; }
        }
        
        @keyframes fadeInUp {
          0% { transform: translateY(30px); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
        
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        
        @keyframes marquee {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
        
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
        
        .animate-slide-left {
          animation: slideInLeft 1s ease-out;
        }
        
        .animate-slide-right {
          animation: slideInRight 1s ease-out;
        }
        
        .animate-fade-up {
          animation: fadeInUp 0.8s ease-out;
        }
        
        .animate-pulse-slow {
          animation: pulse 3s ease-in-out infinite;
        }
        
        .animate-marquee {
          animation: marquee 20s linear infinite;
        }
        
        .gradient-text {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        
        .glass-effect {
          background: rgba(255, 255, 255, 0.25);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.18);
        }
      `}</style>

      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 overflow-hidden">
        {/* Navigation */}
        <nav className="fixed top-0 w-full bg-white/90 backdrop-blur-xl border-b border-gray-200/50 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <h1 className="text-2xl font-bold gradient-text">
                    BoardMix
                  </h1>
                </div>
              </div>
              <div className="hidden md:block">
                <div className="ml-10 flex items-baseline space-x-8">
                  <a href="#features" className="text-gray-600 hover:text-gray-900 px-3 py-2 text-sm font-medium transition-all duration-300 hover:scale-105">
                    Features
                  </a>
                  <a href="#testimonials" className="text-gray-600 hover:text-gray-900 px-3 py-2 text-sm font-medium transition-all duration-300 hover:scale-105">
                    Testimonials
                  </a>
                  <a href="#pricing" className="text-gray-600 hover:text-gray-900 px-3 py-2 text-sm font-medium transition-all duration-300 hover:scale-105">
                    Pricing
                  </a>
                  <Link href="/auth/login">
                    <Button variant="outline" size="sm" className="transition-all duration-300 hover:scale-105 hover:shadow-lg">
                      Login
                    </Button>
                  </Link>
                  <Link href="/auth/login">
                    <Button size="sm" className="transition-all duration-300 hover:scale-105 hover:shadow-lg bg-gradient-to-r from-blue-600 to-indigo-600">
                      Join
                    </Button>
                  </Link>
                </div>
              </div>
              
              {/* Mobile menu button */}
              <div className="md:hidden">
                <Link href="/auth/login">
                  <Button size="sm" className="bg-gradient-to-r from-blue-600 to-indigo-600">
                    Join
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </nav>

        {/* Hero Section with Animated Cards */}
        <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 relative">
          {/* Floating animated cards in background */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-20 left-10 animate-float glass-effect rounded-2xl p-6 w-80 h-48 opacity-80">
              <div className="flex items-center justify-between mb-4">
                <div className="text-2xl font-bold text-gray-800">98.7%</div>
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-white" />
                </div>
              </div>
              <div className="text-sm text-gray-600 mb-2">Board Efficiency</div>
              <div className="text-xs text-gray-500">
                Streamlined governance processes with automated workflows and digital voting systems.
              </div>
            </div>

            <div className="absolute top-40 right-10 animate-float glass-effect rounded-2xl p-6 w-80 h-48 opacity-80" style={{animationDelay: '2s'}}>
              <div className="flex items-center justify-between mb-4">
                <div className="text-2xl font-bold text-gray-800">2.4x</div>
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-white" />
                </div>
              </div>
              <div className="text-sm text-gray-600 mb-2">Faster Decisions</div>
              <div className="text-xs text-gray-500">
                Accelerated decision-making through real-time collaboration and instant notifications.
              </div>
            </div>

            <div className="absolute bottom-20 left-20 animate-float glass-effect rounded-2xl p-6 w-80 h-48 opacity-80" style={{animationDelay: '4s'}}>
              <div className="flex items-center justify-between mb-4">
                <div className="text-2xl font-bold text-gray-800">100%</div>
                <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                  <Shield className="w-5 h-5 text-white" />
                </div>
              </div>
              <div className="text-sm text-gray-600 mb-2">Secure & Compliant</div>
              <div className="text-xs text-gray-500">
                Bank-grade security with SOC 2 compliance and comprehensive audit trails.
              </div>
            </div>
          </div>

          <div className="max-w-7xl mx-auto relative z-10">
            <div className="text-center">
              <div className="animate-fade-up">
                <Badge variant="secondary" className="mb-6 bg-blue-100/80 text-blue-700 hover:bg-blue-200/80 backdrop-blur-sm">
                  <Zap className="w-3 h-3 mr-1" />
                  It's time you own your board operations
                </Badge>
              </div>
              
              <div className="animate-slide-left">
                <h1 className="text-5xl md:text-7xl font-bold text-gray-900 mb-8 leading-tight">
                  It's time you own
                  <br />
                  <span className="gradient-text">your governance</span>
                </h1>
              </div>
              
              <div className="animate-slide-right">
                <p className="text-xl md:text-2xl text-gray-600 mb-12 max-w-4xl mx-auto leading-relaxed">
                  Every year. Starting with 160+ board processes and insights from 
                  top governance professionals. All for just $499.
                </p>
              </div>
              
              <div className="animate-fade-up" style={{animationDelay: '0.5s'}}>
                <Link href="/auth/login">
                  <Button size="lg" className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white px-12 py-4 text-lg font-semibold transition-all duration-300 hover:scale-105 hover:shadow-xl">
                    Start testing
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Moving Text Banner */}
        <section className="py-8 bg-white/50 backdrop-blur-sm border-y border-gray-200/50 overflow-hidden">
          <div className="whitespace-nowrap">
            <div className="animate-marquee inline-block">
              <span className="text-lg text-gray-600 mx-8">Monitor for early indicators of</span>
              <span className="text-lg font-semibold text-orange-600 mx-4">thousands of governance issues.</span>
              <span className="text-lg text-gray-600 mx-8">Board Efficiency</span>
              <span className="text-lg text-gray-600 mx-8">Meeting Management</span>
              <span className="text-lg text-gray-600 mx-8">Document Control</span>
              <span className="text-lg text-gray-600 mx-8">Resolution Tracking</span>
              <span className="text-lg text-gray-600 mx-8">Compliance Monitoring</span>
              <span className="text-lg text-gray-600 mx-8">Audit Trails</span>
            </div>
          </div>
        </section>

        {/* Animated Feature Pills */}
        <section className="py-16 bg-gradient-to-br from-gray-50/80 to-blue-50/80 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-wrap justify-center gap-4 mb-12">
              {[
                'Document Management', 'Meeting Coordination', 'Resolution Tracking', 
                'Compliance Monitoring', 'Audit Trails', 'Digital Voting',
                'Board Analytics', 'Workflow Automation', 'Security Controls'
              ].map((feature, index) => (
                <div 
                  key={feature}
                  className="animate-fade-up glass-effect rounded-full px-6 py-3 text-sm font-medium text-gray-700 hover:scale-105 transition-all duration-300 cursor-pointer"
                  style={{animationDelay: `${index * 0.1}s`}}
                >
                  {feature}
                </div>
              ))}
            </div>
            
            {/* Animated eye images placeholder */}
            <div className="grid md:grid-cols-3 gap-8 mb-16">
              <div className="animate-slide-left glass-effect rounded-2xl p-8 text-center hover:scale-105 transition-all duration-500">
                <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full mx-auto mb-4 flex items-center justify-center animate-pulse-slow">
                  <FileText className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Document Intelligence</h3>
                <p className="text-gray-600">AI-powered document analysis and automated categorization</p>
              </div>
              
              <div className="animate-fade-up glass-effect rounded-2xl p-8 text-center hover:scale-105 transition-all duration-500" style={{animationDelay: '0.2s'}}>
                <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full mx-auto mb-4 flex items-center justify-center animate-pulse-slow">
                  <Users className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Smart Collaboration</h3>
                <p className="text-gray-600">Real-time collaboration with intelligent workflow automation</p>
              </div>
              
              <div className="animate-slide-right glass-effect rounded-2xl p-8 text-center hover:scale-105 transition-all duration-500" style={{animationDelay: '0.4s'}}>
                <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-violet-500 rounded-full mx-auto mb-4 flex items-center justify-center animate-pulse-slow">
                  <BarChart3 className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Governance Analytics</h3>
                <p className="text-gray-600">Deep insights into board performance and decision patterns</p>
              </div>
            </div>
          </div>
        </section>

        {/* Results Tracking Section */}
        <section className="py-20 bg-white/80 backdrop-blur-sm">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="animate-fade-up">
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
                Results tracked
                <br />
                over your <span className="gradient-text">lifetime.</span>
              </h2>
              <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
                Stay aware of how your board is changing.
                <br />
                Results stored in one secure place
                <br />
                for easy access anytime.
              </p>
            </div>
            
            <div className="animate-slide-left mt-16">
              <Badge variant="outline" className="mb-8 text-gray-600 border-gray-300">
                Results Tracking
              </Badge>
              
              {/* Animated chart placeholder */}
              <div className="glass-effect rounded-3xl p-12 max-w-2xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                  <div className="text-left">
                    <div className="text-sm text-gray-600 mb-1">Board Efficiency Score</div>
                    <div className="text-xs text-gray-500">Optimal Range: 85 to 95 points</div>
                  </div>
                  <div className="text-right">
                    <div className="text-4xl font-bold text-orange-600 animate-pulse-slow">92</div>
                    <div className="text-sm text-gray-600">points</div>
                  </div>
                </div>
                
                {/* Animated progress line */}
                <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div className="absolute left-0 top-0 h-full bg-gradient-to-r from-orange-500 to-red-500 rounded-full animate-pulse-slow" style={{width: '92%'}}></div>
                  <div className="absolute right-8 top-0 w-3 h-3 bg-gray-800 rounded-full transform -translate-y-0.5">
                    <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded">
                      JAN, 2025
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Membership Section */}
        <section className="py-20 bg-gradient-to-br from-slate-50/80 to-gray-100/80 backdrop-blur-sm">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid md:grid-cols-2 gap-16 items-center">
              <div className="animate-slide-left">
                <div className="glass-effect rounded-3xl p-12">
                  <div className="mb-8">
                    <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center mb-6">
                      <Building className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-3xl font-bold text-gray-900 mb-4">
                      BoardMix
                      <br />
                      Membership
                    </h3>
                    <p className="text-gray-600 mb-8">It's time you own your governance.</p>
                  </div>
                  
                  <div className="mb-8">
                    <div className="text-5xl font-bold text-gray-900 mb-2">$42</div>
                    <div className="text-gray-600">/month</div>
                    <div className="text-sm text-gray-500">Charged annually at $499</div>
                  </div>
                  
                  <Button className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white py-4 text-lg font-semibold transition-all duration-300 hover:scale-105">
                    Start testing
                  </Button>
                </div>
              </div>
              
              <div className="animate-slide-right space-y-8">
                <div className="flex items-start space-x-4">
                  <CheckCircle className="w-6 h-6 text-green-500 mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">160+ governance processes yearly</h4>
                    <p className="text-gray-600 text-sm">
                      The full cost of governance is included. With advanced processes 
                      typically not covered by traditional tools. 5x more processes than 
                      an avg board platform.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-4">
                  <CheckCircle className="w-6 h-6 text-green-500 mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Expert Insights / Secretary's Summary</h4>
                    <p className="text-gray-600 text-sm">
                      Get insights from top secretaries and 1000s of hours of 
                      research based on your results. Read your Secretary's 
                      Summary written by our expert team after every analysis. 
                      Secretaries can call you promptly if any urgent results arise.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-4">
                  <CheckCircle className="w-6 h-6 text-green-500 mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Lifetime tracking of results</h4>
                    <p className="text-gray-600 text-sm">
                      Results charted over time in one secure place for easy 
                      access. Share with advisors anytime.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-4">
                  <CheckCircle className="w-6 h-6 text-green-500 mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Testing at Premium Locations</h4>
                    <p className="text-gray-600 text-sm">
                      Over 2,000 locations around the US. Platform visits average 
                      15 min.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Comprehensive Features List */}
        <section className="py-20 bg-white/80 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
                <span className="gradient-text">160+</span> governance processes
              </h2>
            </div>
            
            <div className="animate-fade-up">
              <div className="text-sm leading-relaxed text-gray-600 space-y-2">
                <p>
                  <span className="font-semibold text-orange-600">ALL-IN-ONE FOR EVERYONE.</span> Access to: <span className="font-semibold">BOARD</span> Meeting Management, Document Control, Resolution Tracking, 
                  Voting Systems, <span className="font-semibold">COMPLIANCE</span> Audit Trails, Regulatory Reporting, Policy Management, Risk Assessment, <span className="font-semibold">SECURITY</span> Access Controls, 
                  Data Encryption, User Authentication, <span className="font-semibold">ANALYTICS</span> Performance Metrics, Decision Analytics, Trend Analysis, Custom Reports, 
                  <span className="font-semibold">WORKFLOW</span> Process Automation, Task Management, Notification Systems, <span className="font-semibold">COLLABORATION</span> Real-time Editing, 
                  Comment Systems, Version Control, <span className="font-semibold">INTEGRATION</span> API Access, Third-party Connectors, Data Import/Export, 
                  <span className="font-semibold">MOBILE</span> iOS App, Android App, Responsive Design, Offline Access, <span className="font-semibold">SUPPORT</span> 24/7 Help Desk, 
                  Training Resources, Implementation Support, <span className="font-semibold">CUSTOMIZATION</span> Branded Interface, Custom Fields, Workflow Templates, 
                  Role-based Permissions, <span className="font-semibold">BACKUP</span> Automated Backups, Disaster Recovery, Data Redundancy, <span className="font-semibold">GOVERNANCE</span> 
                  Board Evaluations, Director Assessments, Succession Planning, Strategic Planning Tools, Committee Management, Subsidiary Oversight, 
                  <span className="font-semibold">LEGAL</span> Contract Management, Legal Document Storage, Compliance Calendars, Regulatory Updates, 
                  <span className="font-semibold">FINANCIAL</span> Budget Tracking, Financial Reporting, Expense Management, Investment Oversight.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Testimonials with Animation */}
        <section id="testimonials" className="py-20 bg-gradient-to-br from-blue-50/80 to-indigo-50/80 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
                Join hundreds of thousands
                <br />
                <span className="gradient-text">taking charge of their governance</span>
              </h2>
            </div>
            
            <div className="grid md:grid-cols-4 gap-6">
              {[
                {
                  quote: "I am so impressed. I tested on a holiday Sunday and my period started/rescheduled and I got an answer within 5 minutes. Plus help scheduling. I'm impressed with the lab info so far. I really love this more than I thought I would.",
                  delay: '0s'
                },
                {
                  quote: "I appreciate the detailed feedback regarding the test results, food, supplements, causes and why. It makes understanding my governance and making smart choices easier. - Mother of 4 in Kansas",
                  delay: '0.2s'
                },
                {
                  quote: "I learned through my participation with BoardMix that I have been doing governance at the care of MD Anderson Cancer Center for my firm at Leukemia.",
                  delay: '0.4s'
                },
                {
                  quote: "BoardMix is a blessing to my life. If I had started earlier in my life I would not have struggled with compliance and board activities for as long as I did. I am SO excited to have this moving forward. I feel relieved, empowered, and inspired. Thank you BoardMix team!",
                  delay: '0.6s'
                }
              ].map((testimonial, index) => (
                <Card 
                  key={index} 
                  className="p-6 glass-effect border-0 hover:scale-105 transition-all duration-500 animate-fade-up"
                  style={{animationDelay: testimonial.delay}}
                >
                  <CardContent className="p-0">
                    <p className="text-sm text-gray-700 italic leading-relaxed">
                      "{testimonial.quote}"
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Press Logos */}
        <section className="py-16 bg-white/80 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-center items-center space-x-12 opacity-60">
              <div className="text-2xl font-bold text-gray-400">WSJ</div>
              <div className="text-2xl font-bold text-gray-400">Forbes</div>
              <div className="text-2xl font-bold text-gray-400">CNBC</div>
              <div className="text-2xl font-bold text-gray-400">VOGUE</div>
              <div className="text-2xl font-bold text-gray-400">FORTUNE</div>
              <div className="text-2xl font-bold text-gray-400">AXIOS</div>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-20 bg-gradient-to-br from-slate-50/80 to-gray-100/80 backdrop-blur-sm">
          <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
            <div className="animate-fade-up">
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-8 leading-tight">
                It's time you own
                <br />
                <span className="gradient-text">your governance</span>
              </h2>
              <p className="text-xl text-gray-600 mb-12">
                Every year. Starting with 160+ governance processes and insights from 
                top professionals. All for just $499.
              </p>
              <Link href="/auth/login">
                <Button size="lg" className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white px-12 py-4 text-lg font-semibold transition-all duration-300 hover:scale-105 hover:shadow-xl">
                  Start testing
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-gray-900/95 backdrop-blur-sm text-white py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid md:grid-cols-4 gap-8">
              <div>
                <h3 className="text-2xl font-bold mb-4 gradient-text">
                  BoardMix
                </h3>
                <p className="text-gray-400 mb-4">
                  It's time you own your governance.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-4">How it works</h4>
                <ul className="space-y-2 text-gray-400">
                  <li><a href="#" className="hover:text-white transition-colors">Features</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">Pricing</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">Security</a></li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-4">What's included</h4>
                <ul className="space-y-2 text-gray-400">
                  <li><a href="#" className="hover:text-white transition-colors">Governance</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">Compliance</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">Analytics</a></li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-4">Support</h4>
                <ul className="space-y-2 text-gray-400">
                  <li><a href="#" className="hover:text-white transition-colors">FAQ</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">About</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
                </ul>
              </div>
            </div>
            <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
              <p>&copy; 2024 BoardMix. All rights reserved.</p>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}