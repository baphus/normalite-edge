const fs = require('fs');
let code = fs.readFileSync('src/pages/StudentProfileViewPage.tsx', 'utf8');

code = code.replace(/const ProfilePage: React\.FC = \(\) => \{/g, "import { useParams } from 'react-router-dom';\n\nconst StudentProfileViewPage: React.FC = () => {\n    const { id } = useParams<{ id: string }>();\n    const [user, setUser] = useState<any>(null);\n    const [loading, setLoading] = useState(true);");

code = code.replace(/const \{ user, updateUser \} = useAuth\(\);/, "");
code = code.replace(/const \[firstName, setFirstName\] = useState\(''\);/, "const firstName = user?.firstName || user?.name?.split(' ')[0] || '';");
code = code.replace(/const \[lastName, setLastName\] = useState\(''\);/, "const lastName = user?.lastName || user?.name?.split(' ').slice(1).join(' ') || '';");
code = code.replace(/const \[middleInitial, setMiddleInitial\] = useState\(''\);/, "const middleInitial = user?.middleInitial || '';");
code = code.replace(/const \[suffix, setSuffix\] = useState\(''\);/, "const suffix = user?.suffix || '';");
code = code.replace(/const \[email, setEmail\] = useState\(''\);/, "const email = user?.email || '';");
code = code.replace(/const \[picture, setPicture\] = useState<string>\(''\);/, "const picture = user?.picture || '';");
code = code.replace(/const \[imgError, setImgError\] = useState\(false\);/, "const [imgError, setImgError] = useState(false);");
code = code.replace(/const \[trackId, setTrackId\] = useState\(''\);/, "const trackId = user?.track_id || '';");
code = code.replace(/const \[campusId, setCampusId\] = useState\(''\);/, "const campusId = user?.campus_id || '';");
code = code.replace(/const \[yearLevel, setYearLevel\] = useState\(''\);/, "const yearLevel = user?.yearLevel || '';");
code = code.replace(/const \[section, setSection\] = useState\(''\);/, "const section = user?.section || '';");

code = code.replace(/useEffect\(\(\) => \{\n        const resolvedFirstName = user\?\..*?\n    \}, \[user\]\);/s, "useEffect(() => {\n        const fetchStudentProfile = async () => {\n            try {\n                setLoading(true);\n                const response = await api.get('/users/' + id + '/profile');\n                setUser(response.data?.data || null);\n                setPerformance(response.data?.data?.performance || null);\n            } catch (error) {\n                console.error('Failed to load profile', error);\n                toast.error('Unable to load student profile.');\n            } finally {\n                setLoading(false);\n            }\n        };\n        if (id) fetchStudentProfile();\n    }, [id]);");

code = code.replace(/useEffect\(\(\) => \{\n        if \(\!isReviewee\) return;\n\n        const fetchProfilePerformance(.|\n)*?    \}, \[isReviewee\]\);/g, "");

code = code.replace(/const handleProfilePictureSelect(.|\n)*?    \};\n/g, "");
code = code.replace(/const handleCancel(.|\n)*?    \};\n/g, "");
code = code.replace(/const handleSaveProfile(.|\n)*?    \};\n/g, "");
code = code.replace(/onChange=\{.*?\}\n/g, "readOnly\n");
code = code.replace(/onChange=\{\(e\) => setFirstName\(e\.target\.value\)\}/g, "readOnly");
code = code.replace(/onChange=\{\(e\) => setLastName\(e\.target\.value\)\}/g, "readOnly");
code = code.replace(/onChange=\{\(e\) => setMiddleInitial\(e\.target\.value\)\}/g, "readOnly");
code = code.replace(/onValueChange=\{setSuffix\}/g, "disabled");
code = code.replace(/onChange=\{\(e\) => setSection\(e\.target\.value\)\}/g, "readOnly");
code = code.replace(/onValueChange=\{setTrackId\}/g, "disabled");
code = code.replace(/onValueChange=\{setCampusId\}/g, "disabled");
code = code.replace(/onValueChange=\{setYearLevel\}/g, "disabled");

code = code.replace(/<div className="flex justify-end gap-2 pt-1">(.|\n)*?<\/div>/g, "");
code = code.replace(/<label.*?<Camera.*?<\/label>/s, "");

code = code.replace(/export default ProfilePage;/g, "export default StudentProfileViewPage;");

fs.writeFileSync('src/pages/StudentProfileViewPage.tsx', code);
