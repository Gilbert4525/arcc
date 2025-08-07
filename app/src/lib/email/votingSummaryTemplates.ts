import { VotingSummaryData } from './votingSummaryService';

export interface EmailTemplateData {
  subject: string;
  html: string;
  text: string;
}

export class VotingSummaryEmailTemplates {
  /**
   * Generate complete email template for voting summary
   */
  generateEmailTemplate(
    summaryData: VotingSummaryData, 
    type: 'resolution' | 'minutes',
    recipientName: string = 'Board Member'
  ): EmailTemplateData {
    const subject = this.generateSubject(summaryData, type);
    const html = this.generateHTMLTemplate(summaryData, type, recipientName);
    const text = this.generateTextTemplate(summaryData, type, recipientName);

    return { subject, html, text };
  }

  /**
   * Generate clear subject line indicating item and result
   */
  private generateSubject(summaryData: VotingSummaryData, type: 'resolution' | 'minutes'): string {
    const itemTitle = 'title' in summaryData.item ? summaryData.item.title : 'Unknown Item';
    const outcome = summaryData.outcome.passed ? 'PASSED' : 'FAILED';
    const itemType = type === 'resolution' ? 'Resolution' : 'Minutes';
    
    // Truncate title if too long for subject line
    const truncatedTitle = itemTitle.length > 50 ? itemTitle.substring(0, 47) + '...' : itemTitle;
    
    return `Arc Board Management - ${itemType} Voting Complete: ${truncatedTitle} - ${outcome}`;
  }

  /**
   * Generate comprehensive HTML email template
   */
  private generateHTMLTemplate(
    summaryData: VotingSummaryData, 
    type: 'resolution' | 'minutes',
    recipientName: string
  ): string {
    const itemTitle = 'title' in summaryData.item ? summaryData.item.title : 'Unknown Item';
    const itemType = type === 'resolution' ? 'Resolution' : 'Minutes';
    const stats = summaryData.statistics;
    const outcome = summaryData.outcome;
    
    // Determine colors based on outcome
    const outcomeColor = outcome.passed ? '#10B981' : '#EF4444'; // Green for passed, red for failed
    const typeColor = type === 'resolution' ? '#8B5CF6' : '#3B82F6'; // Purple for resolution, blue for minutes

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Voting Summary - ${itemTitle}</title>
    <style>
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; 
            line-height: 1.6; 
            color: #374151; 
            max-width: 800px; 
            margin: 0 auto; 
            padding: 20px; 
            background-color: #f9fafb;
        }
        .container { 
            background: white; 
            border-radius: 12px; 
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); 
            overflow: hidden;
        }
        .header { 
            background: linear-gradient(135deg, ${typeColor} 0%, ${typeColor}CC 100%); 
            padding: 30px; 
            text-align: center; 
            color: white;
        }
        .header h1 { 
            margin: 0; 
            font-size: 28px; 
            font-weight: 700;
        }
        .header p { 
            margin: 8px 0 0 0; 
            opacity: 0.9; 
            font-size: 16px;
        }
        .content { 
            padding: 30px;
        }
        .outcome-banner { 
            background: ${outcomeColor}; 
            color: white; 
            padding: 20px; 
            border-radius: 8px; 
            text-align: center; 
            margin-bottom: 30px;
        }
        .outcome-banner h2 { 
            margin: 0; 
            font-size: 24px; 
            font-weight: 700;
        }
        .outcome-banner p { 
            margin: 8px 0 0 0; 
            font-size: 16px; 
            opacity: 0.9;
        }
        .section { 
            margin-bottom: 30px;
        }
        .section h3 { 
            color: ${typeColor}; 
            font-size: 20px; 
            font-weight: 600; 
            margin-bottom: 15px; 
            border-bottom: 2px solid #e5e7eb; 
            padding-bottom: 8px;
        }
        .stats-grid { 
            display: grid; 
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); 
            gap: 20px; 
            margin-bottom: 20px;
        }
        .stat-card { 
            background: #f8fafc; 
            padding: 20px; 
            border-radius: 8px; 
            border-left: 4px solid ${typeColor}; 
            text-align: center;
        }
        .stat-number { 
            font-size: 32px; 
            font-weight: 700; 
            color: ${typeColor}; 
            display: block;
        }
        .stat-label { 
            font-size: 14px; 
            color: #6b7280; 
            margin-top: 4px;
        }
        .vote-breakdown { 
            background: #f8fafc; 
            padding: 20px; 
            border-radius: 8px; 
            margin-bottom: 20px;
        }
        .vote-row { 
            display: flex; 
            justify-content: space-between; 
            align-items: center; 
            padding: 12px 0; 
            border-bottom: 1px solid #e5e7eb;
        }
        .vote-row:last-child { 
            border-bottom: none;
        }
        .vote-type { 
            font-weight: 600;
        }
        .vote-count { 
            font-weight: 700; 
            font-size: 18px;
        }
        .approve { color: #10b981; }
        .reject { color: #ef4444; }
        .abstain { color: #f59e0b; }
        .voters-table { 
            width: 100%; 
            border-collapse: collapse; 
            margin-top: 15px;
        }
        .voters-table th, .voters-table td { 
            padding: 12px; 
            text-align: left; 
            border-bottom: 1px solid #e5e7eb;
        }
        .voters-table th { 
            background: #f8fafc; 
            font-weight: 600; 
            color: #374151;
        }
        .vote-badge { 
            padding: 4px 12px; 
            border-radius: 20px; 
            font-size: 12px; 
            font-weight: 600; 
            text-transform: uppercase;
        }
        .vote-approve { 
            background: #d1fae5; 
            color: #065f46;
        }
        .vote-reject { 
            background: #fee2e2; 
            color: #991b1b;
        }
        .vote-abstain { 
            background: #fef3c7; 
            color: #92400e;
        }
        .comment-indicator { 
            background: #dbeafe; 
            color: #1e40af; 
            padding: 2px 6px; 
            border-radius: 4px; 
            font-size: 11px; 
            margin-left: 8px;
        }
        .non-voters { 
            background: #fef2f2; 
            border: 1px solid #fecaca; 
            border-radius: 8px; 
            padding: 20px;
        }
        .non-voters h4 { 
            color: #dc2626; 
            margin-top: 0;
        }
        .non-voter-list { 
            display: flex; 
            flex-wrap: wrap; 
            gap: 8px;
        }
        .non-voter-tag { 
            background: white; 
            border: 1px solid #fca5a5; 
            color: #dc2626; 
            padding: 4px 12px; 
            border-radius: 20px; 
            font-size: 14px;
        }
        .insights { 
            background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); 
            border: 1px solid #bae6fd; 
            border-radius: 8px; 
            padding: 20px;
        }
        .insights h4 { 
            color: #0369a1; 
            margin-top: 0;
        }
        .insight-item { 
            display: flex; 
            align-items: center; 
            margin-bottom: 8px;
        }
        .insight-icon { 
            width: 20px; 
            height: 20px; 
            margin-right: 12px; 
            flex-shrink: 0;
        }
        .footer { 
            background: #f8fafc; 
            padding: 20px 30px; 
            border-top: 1px solid #e5e7eb; 
            text-align: center; 
            color: #6b7280; 
            font-size: 14px;
        }
        .cta-button { 
            display: inline-block; 
            background: ${typeColor}; 
            color: white; 
            padding: 12px 24px; 
            text-decoration: none; 
            border-radius: 6px; 
            font-weight: 600; 
            margin: 20px 0;
        }
        .timestamp { 
            color: #9ca3af; 
            font-size: 14px; 
            font-style: italic;
        }
        @media (max-width: 600px) {
            .stats-grid { 
                grid-template-columns: 1fr;
            }
            .vote-row { 
                flex-direction: column; 
                align-items: flex-start;
            }
            .voters-table { 
                font-size: 14px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- Header -->
        <div class="header">
            <h1>Arc Board Management</h1>
            <p>${itemType} Voting Summary</p>
        </div>

        <!-- Content -->
        <div class="content">
            <!-- Greeting -->
            <p style="font-size: 16px; margin-bottom: 20px;">Hello ${recipientName},</p>
            
            <p>Voting has concluded for the following ${itemType.toLowerCase()}:</p>
            <h2 style="color: #1f2937; margin: 20px 0;">${itemTitle}</h2>

            <!-- Outcome Banner -->
            <div class="outcome-banner">
                <h2>${outcome.passed ? '✅ PASSED' : '❌ FAILED'}</h2>
                <p>${outcome.reason}</p>
            </div>

            <!-- Summary Statistics -->
            <div class="section">
                <h3>📊 Voting Summary</h3>
                <div class="stats-grid">
                    <div class="stat-card">
                        <span class="stat-number">${stats.totalVotes}</span>
                        <div class="stat-label">Total Votes Cast</div>
                    </div>
                    <div class="stat-card">
                        <span class="stat-number">${stats.participationRate.toFixed(1)}%</span>
                        <div class="stat-label">Participation Rate</div>
                    </div>
                    <div class="stat-card">
                        <span class="stat-number">${stats.approvalPercentage.toFixed(1)}%</span>
                        <div class="stat-label">Approval Rate</div>
                    </div>
                    <div class="stat-card">
                        <span class="stat-number">${stats.engagementScore}/100</span>
                        <div class="stat-label">Engagement Score</div>
                    </div>
                </div>

                <!-- Vote Breakdown -->
                <div class="vote-breakdown">
                    <div class="vote-row">
                        <span class="vote-type approve">✅ Approve</span>
                        <span class="vote-count approve">${stats.approveVotes} (${stats.approvalPercentage.toFixed(1)}%)</span>
                    </div>
                    <div class="vote-row">
                        <span class="vote-type reject">❌ Reject</span>
                        <span class="vote-count reject">${stats.rejectVotes} (${stats.rejectionPercentage.toFixed(1)}%)</span>
                    </div>
                    <div class="vote-row">
                        <span class="vote-type abstain">⚪ Abstain</span>
                        <span class="vote-count abstain">${stats.abstainVotes} (${stats.abstentionPercentage.toFixed(1)}%)</span>
                    </div>
                </div>
            </div>

            <!-- Detailed Voting Results -->
            <div class="section">
                <h3>🗳️ Individual Votes</h3>
                <table class="voters-table">
                    <thead>
                        <tr>
                            <th>Board Member</th>
                            <th>Vote</th>
                            <th>Comments</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${summaryData.votes.map(vote => `
                            <tr>
                                <td>
                                    <strong>${vote.voter.full_name}</strong>
                                    ${vote.voter.position ? `<br><small style="color: #6b7280;">${vote.voter.position}</small>` : ''}
                                </td>
                                <td>
                                    <span class="vote-badge vote-${vote.vote === 'approve' || vote.vote === 'for' ? 'approve' : vote.vote === 'reject' || vote.vote === 'against' ? 'reject' : 'abstain'}">
                                        ${vote.vote === 'approve' || vote.vote === 'for' ? 'Approve' : vote.vote === 'reject' || vote.vote === 'against' ? 'Reject' : 'Abstain'}
                                    </span>
                                    ${vote.hasComments ? '<span class="comment-indicator">💬 Comment</span>' : ''}
                                </td>
                                <td>
                                    ${vote.hasComments ? 
                                        `<em style="color: #4b5563;">${(vote.comments || vote.vote_reason || '').substring(0, 100)}${(vote.comments || vote.vote_reason || '').length > 100 ? '...' : ''}</em>` : 
                                        '<span style="color: #9ca3af;">No comment</span>'
                                    }
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>

            <!-- Non-Voters Section -->
            ${summaryData.nonVoters.length > 0 ? `
            <div class="section">
                <div class="non-voters">
                    <h4>⚠️ Members Who Did Not Vote (${summaryData.nonVoters.length})</h4>
                    <div class="non-voter-list">
                        ${summaryData.nonVoters.map(member => `
                            <span class="non-voter-tag">${member.full_name}</span>
                        `).join('')}
                    </div>
                    <p style="margin-top: 15px; font-size: 14px; color: #6b7280;">
                        Board participation is crucial for effective governance. Please encourage all members to participate in future votes.
                    </p>
                </div>
            </div>
            ` : ''}

            <!-- Insights Section -->
            <div class="section">
                <div class="insights">
                    <h4>💡 Voting Insights</h4>
                    <div class="insight-item">
                        <span class="insight-icon">${stats.quorumStatus.met ? '✅' : '❌'}</span>
                        <span>Quorum ${stats.quorumStatus.met ? 'was met' : 'was NOT met'} (${stats.quorumStatus.percentage.toFixed(1)}% participation)</span>
                    </div>
                    <div class="insight-item">
                        <span class="insight-icon">${stats.isUnanimous ? '🤝' : '📊'}</span>
                        <span>${stats.isUnanimous ? `Unanimous ${stats.unanimousType} vote` : `${stats.consensusLevel.charAt(0).toUpperCase() + stats.consensusLevel.slice(1)} consensus level`}</span>
                    </div>
                    <div class="insight-item">
                        <span class="insight-icon">💬</span>
                        <span>${stats.commentAnalysis.totalComments} member${stats.commentAnalysis.totalComments !== 1 ? 's' : ''} provided comments (${stats.commentAnalysis.participationWithComments.toFixed(1)}% comment rate)</span>
                    </div>
                    ${stats.commentAnalysis.hasSignificantConcerns ? `
                    <div class="insight-item">
                        <span class="insight-icon">⚠️</span>
                        <span style="color: #dc2626;">Significant concerns were raised in the comments</span>
                    </div>
                    ` : ''}
                </div>
            </div>

            <!-- Call to Action -->
            <div style="text-align: center; margin: 30px 0;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://boardmix.com'}/dashboard/${type === 'resolution' ? 'resolutions' : 'minutes'}" class="cta-button">
                    View Full Details in System
                </a>
            </div>

            <!-- Timestamp -->
            <p class="timestamp">
                Voting concluded on ${new Date().toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                })}
            </p>
        </div>

        <!-- Footer -->
        <div class="footer">
            <p>This is an automated notification from Arc Board Management System.</p>
            <p>You can manage your notification preferences in your account settings.</p>
            <p style="margin-top: 15px; font-size: 12px; color: #9ca3af;">
                © ${new Date().getFullYear()} Arc Board Management. All rights reserved.
            </p>
        </div>
    </div>
</body>
</html>`;
  }

  /**
   * Generate comprehensive text-only email template for accessibility
   */
  private generateTextTemplate(
    summaryData: VotingSummaryData, 
    type: 'resolution' | 'minutes',
    recipientName: string
  ): string {
    const itemTitle = 'title' in summaryData.item ? summaryData.item.title : 'Unknown Item';
    const itemType = type === 'resolution' ? 'Resolution' : 'Minutes';
    const stats = summaryData.statistics;
    const outcome = summaryData.outcome;

    return `
ARC BOARD MANAGEMENT - ${itemType.toUpperCase()} VOTING SUMMARY
${'='.repeat(60)}

Hello ${recipientName},

Voting has concluded for the following ${itemType.toLowerCase()}:

${itemTitle}

RESULT: ${outcome.passed ? 'PASSED' : 'FAILED'}
Reason: ${outcome.reason}

VOTING SUMMARY
--------------
Total Votes Cast: ${stats.totalVotes} of ${stats.totalEligibleVoters} eligible voters
Participation Rate: ${stats.participationRate.toFixed(1)}%
Approval Rate: ${stats.approvalPercentage.toFixed(1)}%
Engagement Score: ${stats.engagementScore}/100

VOTE BREAKDOWN
--------------
✓ Approve: ${stats.approveVotes} (${stats.approvalPercentage.toFixed(1)}%)
✗ Reject: ${stats.rejectVotes} (${stats.rejectionPercentage.toFixed(1)}%)
○ Abstain: ${stats.abstainVotes} (${stats.abstentionPercentage.toFixed(1)}%)

INDIVIDUAL VOTES
----------------
${summaryData.votes.map(vote => {
  const voteDisplay = vote.vote === 'approve' || vote.vote === 'for' ? 'APPROVE' : 
                     vote.vote === 'reject' || vote.vote === 'against' ? 'REJECT' : 'ABSTAIN';
  const comment = vote.hasComments ? 
    `\n   Comment: "${(vote.comments || vote.vote_reason || '').substring(0, 200)}${(vote.comments || vote.vote_reason || '').length > 200 ? '...' : ''}"` : '';
  
  return `• ${vote.voter.full_name}${vote.voter.position ? ` (${vote.voter.position})` : ''}: ${voteDisplay}${comment}`;
}).join('\n')}

${summaryData.nonVoters.length > 0 ? `
MEMBERS WHO DID NOT VOTE (${summaryData.nonVoters.length})
${'─'.repeat(30)}
${summaryData.nonVoters.map(member => `• ${member.full_name}`).join('\n')}

Board participation is crucial for effective governance. Please encourage all members to participate in future votes.
` : ''}

VOTING INSIGHTS
---------------
• Quorum: ${stats.quorumStatus.met ? 'MET' : 'NOT MET'} (${stats.quorumStatus.percentage.toFixed(1)}% participation)
• Consensus: ${stats.isUnanimous ? `Unanimous ${stats.unanimousType} vote` : `${stats.consensusLevel.charAt(0).toUpperCase() + stats.consensusLevel.slice(1)} consensus level`}
• Comments: ${stats.commentAnalysis.totalComments} member${stats.commentAnalysis.totalComments !== 1 ? 's' : ''} provided comments (${stats.commentAnalysis.participationWithComments.toFixed(1)}% comment rate)
${stats.commentAnalysis.hasSignificantConcerns ? '• WARNING: Significant concerns were raised in the comments' : ''}

VIEW FULL DETAILS
-----------------
Access the complete ${itemType.toLowerCase()} details in the system:
${process.env.NEXT_PUBLIC_APP_URL || 'https://boardmix.com'}/dashboard/${type === 'resolution' ? 'resolutions' : 'minutes'}

Voting concluded on ${new Date().toLocaleDateString('en-US', { 
  weekday: 'long', 
  year: 'numeric', 
  month: 'long', 
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit'
})}

${'─'.repeat(60)}
This is an automated notification from Arc Board Management System.
You can manage your notification preferences in your account settings.

© ${new Date().getFullYear()} Arc Board Management. All rights reserved.
    `.trim();
  }

  /**
   * Generate personalized email content based on recipient's voting status
   */
  generatePersonalizedContent(
    summaryData: VotingSummaryData,
    recipientEmail: string
  ): { participationMessage: string; personalNote: string } {
    // Find if recipient voted
    const userVote = summaryData.votes.find(vote => vote.voter.email === recipientEmail);
    const didNotVote = summaryData.nonVoters.find(member => member.email === recipientEmail);

    let participationMessage = '';
    let personalNote = '';

    if (userVote) {
      const voteDisplay = userVote.vote === 'approve' || userVote.vote === 'for' ? 'approved' : 
                         userVote.vote === 'reject' || userVote.vote === 'against' ? 'rejected' : 'abstained';
      
      participationMessage = `Thank you for participating in this vote. You ${voteDisplay} this item.`;
      
      if (userVote.hasComments) {
        personalNote = 'Your comments have been included in the summary above.';
      }
    } else if (didNotVote) {
      participationMessage = 'You did not participate in this vote.';
      personalNote = 'Your participation in future votes is important for effective board governance. Please ensure you vote on upcoming items.';
    } else {
      participationMessage = 'Thank you for your participation in board governance.';
    }

    return { participationMessage, personalNote };
  }

  /**
   * Generate email template with voting period information
   */
  generateVotingPeriodInfo(summaryData: VotingSummaryData): string {
    const item = summaryData.item;
    const createdAt = item.created_at ? new Date(item.created_at) : null;
    const votingDeadline = 'voting_deadline' in item && item.voting_deadline ? 
      new Date(item.voting_deadline) : null;

    if (!createdAt) {
      return 'Voting period information not available.';
    }

    const startDate = createdAt.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    if (votingDeadline) {
      const endDate = votingDeadline.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      
      const duration = Math.ceil((votingDeadline.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
      
      return `Voting Period: ${startDate} to ${endDate} (${duration} day${duration !== 1 ? 's' : ''})`;
    } else {
      return `Voting started: ${startDate} (No deadline specified)`;
    }
  }
}