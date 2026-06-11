import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { type, details } = body;

        const owner = process.env.GITHUB_REPO_OWNER;
        const repo = process.env.GITHUB_REPO_NAME;
        const token = process.env.GITHUB_ACCESS_TOKEN;

        if (!owner || !repo || !token) {
            return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
        }

        // Format the issue title and body
        const issueTitle = `[${type.toUpperCase()}] User Submission`;
        const issueBody = `
**Type:** ${type}
**Submitted via:** In-App Feedback Widget

**Details:**
${details}
    `;

        // Call the GitHub API
        const githubRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/issues`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json',
                'User-Agent': 'NextJS-Feedback-Widget',
            },
            cache: 'no-store',
            body: JSON.stringify({
                title: issueTitle,
                body: issueBody,
                labels: [type === 'bug' ? 'bug' : 'enhancement', 'user-reported']
            }),
        });

        if (!githubRes.ok) {
            // Capture the actual error message returned by GitHub
            const errorData = await githubRes.json().catch(() => ({}));
            console.error('GitHub API Error Details:', {
                status: githubRes.status,
                statusText: githubRes.statusText,
                errorData
            });

            throw new Error(`Failed to create GitHub issue: ${githubRes.statusText}`);
        }

        return NextResponse.json({ success: true }, { status: 201 });
    } catch (error) {
        console.error('Feedback submission error:', error);
        return NextResponse.json({ error: 'Failed to submit feedback' }, { status: 500 });
    }
}