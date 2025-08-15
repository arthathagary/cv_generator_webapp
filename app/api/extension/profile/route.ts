import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function GET(req: NextRequest) {
    try {
        console.log('[Profile API] GET request received');

        // Extract authorization header
        const authHeader = req.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({ 
                success: false, 
                error: 'Missing or invalid authorization header' 
            }, { status: 401 });
        }

        const accessToken = authHeader.substring(7);
        console.log('[Profile API] Access token received:', accessToken ? '✓' : '✗');

        // Get the NextAuth JWT token to identify the user
        const token = await getToken({ 
            req, 
            secret: process.env.NEXTAUTH_SECRET 
        });

        let userName = 'Your Name';
        let userEmail = 'your.email@example.com';

        // If we have a NextAuth session, use that data
        if (token) {
            userName = token.name || userName;
            userEmail = token.email || userEmail;
            console.log('[Profile API] Using session data for user:', userName);
        } else {
            console.log('[Profile API] No session found, using default profile');
        }

        // Return profile data based on the authenticated user
        const userProfile = {
            personalInfo: {
                name: userName,
                email: userEmail,
                phone: "+1 (555) 123-4567", // You can customize this or make it dynamic
                location: "Your City, State", // You can customize this
                linkedin: "linkedin.com/in/yourprofile",
                portfolio: "yourportfolio.com", 
                github: "github.com/yourusername"
            },
            summary: `Experienced software developer with expertise in full-stack development. Currently working with modern technologies and passionate about creating efficient solutions.`,
            experience: [
                {
                    title: "Software Developer",
                    company: "Your Company",
                    duration: "2023 - Present",
                    location: "Your City, State",
                    achievements: [
                        "Developed and maintained web applications using modern frameworks",
                        "Collaborated with cross-functional teams to deliver high-quality software", 
                        "Improved application performance and user experience"
                    ]
                },
                {
                    title: "Junior Developer",
                    company: "Previous Company", 
                    duration: "2021 - 2023",
                    location: "City, State",
                    achievements: [
                        "Built responsive web interfaces using React and TypeScript",
                        "Participated in code reviews and maintained coding standards"
                    ]
                }
            ],
            skills: {
                technical: [
                    "JavaScript", "TypeScript", "React", "Next.js", "Node.js", 
                    "Python", "SQL", "MongoDB", "PostgreSQL", "AWS", 
                    "Docker", "Git", "REST APIs", "HTML", "CSS"
                ],
                soft: [
                    "Problem Solving", "Communication", "Team Collaboration", 
                    "Project Management", "Leadership", "Agile Methodologies"
                ]
            },
            education: [
                {
                    degree: "Bachelor of Science in Computer Science",
                    institution: "Your University",
                    year: "2021",
                    gpa: "3.5"
                }
            ],
            certifications: [
                {
                    name: "AWS Certified Developer",
                    issuer: "Amazon Web Services",
                    year: "2023"
                }
            ],
            languages: ["English (Native)"],
            interests: ["Software Development", "Open Source", "Technology", "Problem Solving"]
        };

        console.log('[Profile API] Returning profile data for user:', userName);
        
        return NextResponse.json({
            success: true,
            profile: userProfile,
            message: 'Profile retrieved successfully'
        });

    } catch (error) {
        console.error('[Profile API] Error:', error);
        return NextResponse.json({ 
            success: false, 
            error: 'Internal server error' 
        }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        console.log('[Profile API] POST request received');

        // Extract authorization header
        const authHeader = req.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({ 
                success: false, 
                error: 'Missing or invalid authorization header' 
            }, { status: 401 });
        }

        const body = await req.json();
        const { profile } = body;

        console.log('[Profile API] Profile update request:', Object.keys(profile || {}));

        // In production, this would update the user's profile in the database
        // For now, just acknowledge the update
        
        return NextResponse.json({
            success: true,
            message: 'Profile updated successfully'
        });

    } catch (error) {
        console.error('[Profile API] Error updating profile:', error);
        return NextResponse.json({ 
            success: false, 
            error: 'Internal server error' 
        }, { status: 500 });
    }
}
