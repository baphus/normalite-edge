<!-- Student Performance Dashboard -->
<!DOCTYPE html>
<html class="light" lang="en"><head>
<meta charset="utf-8"/>
<meta content="width=device-width, initial-scale=1.0" name="viewport"/>
<title>Mock Exam Library - Normalite Admin</title>
<link href="https://fonts.googleapis.com" rel="preconnect"/>
<link crossorigin="" href="https://fonts.gstatic.com" rel="preconnect"/>
<link href="https://fonts.googleapis.com/css2?family=Lexend:wght@100..900&amp;family=Noto+Sans:wght@100..900&amp;display=swap" rel="stylesheet"/>
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet"/>
<script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
<script id="tailwind-config">
        tailwind.config = {
            darkMode: "class",
            theme: {
                extend: {
                    colors: {
                        "primary": "#800000",
                        "accent": "#F59E0B",
                        "background-light": "#f8f5f5",
                        "background-dark": "#230f0f",
                    },
                    fontFamily: {
                        "display": ["Lexend", "sans-serif"],
                        "body": ["Noto Sans", "sans-serif"],
                    },
                    borderRadius: {"DEFAULT": "0.375rem", "lg": "0.5rem", "xl": "0.75rem", "2xl": "1rem", "full": "9999px"},
                },
            },
        }
    </script>
<style>
        ::-webkit-scrollbar {
            width: 8px;
            height: 8px;
        }
        ::-webkit-scrollbar-track {
            background: transparent; 
        }
        ::-webkit-scrollbar-thumb {
            background: #d1d5db; 
            border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb:hover {
            background: #9ca3af; 
        }
    </style>
</head>
<body class="bg-background-light dark:bg-background-dark text-[#1d0c0c] dark:text-white font-display overflow-hidden">
<div class="flex h-screen w-full">
<aside class="flex w-64 flex-col border-r border-[#e5e7eb] bg-white dark:bg-[#1a0a0a] dark:border-[#3a1a1a] transition-all duration-300 hidden md:flex shrink-0 z-20">
<div class="flex h-full flex-col justify-between p-4">
<div class="flex flex-col gap-6">
<div class="flex items-center gap-3 px-2 py-2">
<div class="bg-center bg-no-repeat bg-cover rounded-full h-10 w-10 shadow-sm border border-primary/20" style='background-image: url("https://lh3.googleusercontent.com/aida-public/AB6AXuDRPPNAtErCq7KnUYhj2JsmJNhkhexjuGMyftx05EykHw3q1BlzO-71-JUqsyQSFSiag1qAKfi6bcA9G4HUgLH1lLaFzKMl9DKsXWwXV0LdNJ02QNwnvh0WdIdFpy2zVJg73wjkd-PXjqbBElMEF5bOGlukZ5tUK9GGdjXWh5MWEDuPjDjM55USlSs5AGGZgVZmG8pOwiXYtj1yKgNzA-AvvZAO9x3_VXoFCpwqbuUsTJFM7b4mNxI7kjy_2gqMFqaI0pkK4DcIYkVd");'></div>
<div class="flex flex-col">
<h1 class="text-primary text-lg font-bold leading-tight tracking-tight">Normalite</h1>
<p class="text-gray-500 text-xs font-normal">Admin Portal</p>
</div>
</div>
<nav class="flex flex-col gap-1">
<a class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 hover:bg-gray-50 hover:text-primary dark:text-gray-300 dark:hover:bg-white/5 transition-colors" href="#">
<span class="material-symbols-outlined text-[20px]">dashboard</span>
<p class="text-sm font-medium">Dashboard</p>
</a>
<a class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 hover:bg-gray-50 hover:text-primary dark:text-gray-300 dark:hover:bg-white/5 transition-colors" href="#">
<span class="material-symbols-outlined text-[20px]">library_books</span>
<p class="text-sm font-medium">Subjects</p>
</a>
<a class="relative flex items-center gap-3 px-3 py-2.5 rounded-lg bg-primary/5 text-primary transition-colors" href="#">
<div class="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 bg-primary rounded-r-full"></div>
<span class="material-symbols-outlined text-[20px] font-variation-settings-'FILL'1">assignment</span>
<p class="text-sm font-bold">Exams</p>
</a>
<a class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 hover:bg-gray-50 hover:text-primary dark:text-gray-300 dark:hover:bg-white/5 transition-colors" href="#">
<span class="material-symbols-outlined text-[20px]">quiz</span>
<p class="text-sm font-medium">Questions Bank</p>
</a>
<a class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 hover:bg-gray-50 hover:text-primary dark:text-gray-300 dark:hover:bg-white/5 transition-colors" href="#">
<span class="material-symbols-outlined text-[20px]">style</span>
<p class="text-sm font-medium">Flashcards</p>
</a>
<a class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 hover:bg-gray-50 hover:text-primary dark:text-gray-300 dark:hover:bg-white/5 transition-colors" href="#">
<span class="material-symbols-outlined text-[20px]">group</span>
<p class="text-sm font-medium">Users</p>
</a>
<a class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 hover:bg-gray-50 hover:text-primary dark:text-gray-300 dark:hover:bg-white/5 transition-colors" href="#">
<span class="material-symbols-outlined text-[20px]">bar_chart</span>
<p class="text-sm font-medium">Reports</p>
</a>
<a class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 hover:bg-gray-50 hover:text-primary dark:text-gray-300 dark:hover:bg-white/5 transition-colors" href="#">
<span class="material-symbols-outlined text-[20px]">settings</span>
<p class="text-sm font-medium">Settings</p>
</a>
</nav>
</div>
<div class="flex flex-col gap-4 border-t border-gray-100 pt-4 dark:border-white/10">
<div class="flex items-center gap-3 px-2">
<div class="h-9 w-9 rounded-full bg-gray-200 bg-cover bg-center" style='background-image: url("https://lh3.googleusercontent.com/aida-public/AB6AXuDlj7X3FeByZgwcrzsXQJwePv-4yl8HA3bmTcnNF5lOgngG9vpjm_kyYznzAPZgPVIZ-iMHlmeLbCxxpq7CR0YM-1BmepRG_eeyil5lqU2SlUhs9CHW8_FrpUtQdHmoXzl8DTzoy5_otYgexhRADm4-hnUyPM1rjk5okTceIRQral4XdpNixjnPxWisoyjD-rAs9h-1yU_deBaVQXXGAgGafWOKjyID8Bj0sZqv-7JuPA06AKS6bvqdQNAoiXA1T1tArTvVkGymOOhr");'></div>
<div class="flex flex-col overflow-hidden">
<p class="text-sm font-medium text-gray-900 dark:text-white truncate">Admin User</p>
<p class="text-xs text-gray-500 truncate">Administrator</p>
</div>
</div>
<button class="flex w-full items-center gap-2 justify-center rounded-lg h-9 px-4 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 text-sm font-semibold transition-colors dark:bg-white/5 dark:border-white/10 dark:text-gray-300 dark:hover:bg-white/10">
<span class="material-symbols-outlined text-[18px]">logout</span>
<span>Log Out</span>
</button>
</div>
</div>
</aside>
<main class="flex-1 flex flex-col h-screen overflow-hidden bg-background-light dark:bg-background-dark">
<div class="md:hidden flex shrink-0 items-center justify-between p-4 bg-white dark:bg-[#1a0a0a] border-b border-gray-200 dark:border-white/10">
<div class="flex items-center gap-2">
<div class="bg-primary/10 p-1.5 rounded-md">
<span class="material-symbols-outlined text-primary">school</span>
</div>
<span class="font-bold text-lg text-primary">Normalite Admin</span>
</div>
<button class="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-white/10">
<span class="material-symbols-outlined">menu</span>
</button>
</div>
<header class="bg-white dark:bg-[#1a0a0a] border-b border-gray-200 dark:border-white/10 px-6 py-6 shrink-0 z-10">
<div class="container mx-auto max-w-6xl">
<div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
<div>
<h2 class="text-2xl font-bold text-gray-900 dark:text-white">Mock Exam Library</h2>
<p class="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage and organize all LET preparation exams.</p>
</div>
<div class="flex items-center gap-3">
<div class="relative hidden lg:block">
<span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[20px]">search</span>
<input class="pl-10 pr-4 py-2 border border-gray-200 dark:border-white/10 dark:bg-white/5 rounded-lg text-sm focus:ring-primary focus:border-primary w-64" placeholder="Search exams..." type="text"/>
</div>
<button class="px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary/90 text-sm font-medium transition-colors shadow-sm shadow-primary/20 flex items-center gap-2">
<span class="material-symbols-outlined text-[18px]">add</span>
                            Create New Exam
                        </button>
</div>
</div>
</div>
</header>
<div class="bg-white dark:bg-[#1a0a0a] border-b border-gray-200 dark:border-white/10 px-6 py-0 shrink-0 z-10">
<div class="container mx-auto max-w-6xl">
<div class="flex items-center justify-between">
<nav class="flex gap-8">
<button class="border-b-2 border-primary py-4 px-1 text-sm font-bold text-primary flex items-center gap-2">
                            All Exams
                            <span class="bg-primary/10 text-primary text-[10px] px-1.5 py-0.5 rounded-full">12</span>
</button>
<button class="border-b-2 border-transparent py-4 px-1 text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition-colors flex items-center gap-2">
                            Active / Live
                            <span class="bg-gray-100 dark:bg-white/10 text-gray-500 text-[10px] px-1.5 py-0.5 rounded-full">8</span>
</button>
<button class="border-b-2 border-transparent py-4 px-1 text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition-colors flex items-center gap-2">
                            Drafts
                            <span class="bg-gray-100 dark:bg-white/10 text-gray-500 text-[10px] px-1.5 py-0.5 rounded-full">3</span>
</button>
<button class="border-b-2 border-transparent py-4 px-1 text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition-colors flex items-center gap-2">
                            Archived
                            <span class="bg-gray-100 dark:bg-white/10 text-gray-500 text-[10px] px-1.5 py-0.5 rounded-full">1</span>
</button>
</nav>
<div class="flex items-center gap-2">
<button class="p-2 text-gray-400 hover:text-primary rounded-lg hover:bg-gray-50">
<span class="material-symbols-outlined">filter_list</span>
</button>
<button class="p-2 text-gray-400 hover:text-primary rounded-lg hover:bg-gray-50">
<span class="material-symbols-outlined">grid_view</span>
</button>
</div>
</div>
</div>
</div>
<div class="flex-1 overflow-y-auto">
<div class="container mx-auto max-w-6xl px-6 py-8">
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
<div class="bg-white dark:bg-[#1a0a0a] rounded-xl border border-gray-200 dark:border-white/10 overflow-hidden shadow-sm hover:shadow-md transition-shadow group">
<div class="p-5 flex flex-col h-full">
<div class="flex items-start justify-between mb-4">
<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
<span class="w-1.5 h-1.5 rounded-full bg-green-600 mr-1.5"></span>
                                    Live
                                </span>
<div class="relative group/menu">
<button class="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
<span class="material-symbols-outlined">more_vert</span>
</button>
</div>
</div>
<div class="mb-4">
<h3 class="text-base font-bold text-gray-900 dark:text-white group-hover:text-primary transition-colors">LET 2024 Comprehensive: Professional Education</h3>
<p class="text-xs text-gray-500 mt-1 uppercase tracking-wider font-semibold">General Education</p>
</div>
<div class="flex items-center gap-4 text-xs text-gray-500 mb-6 pb-6 border-b border-gray-100 dark:border-white/5">
<div class="flex items-center gap-1">
<span class="material-symbols-outlined text-[16px]">quiz</span>
<span>150 Questions</span>
</div>
<div class="flex items-center gap-1">
<span class="material-symbols-outlined text-[16px]">schedule</span>
<span>180 min</span>
</div>
</div>
<div class="mt-auto grid grid-cols-2 gap-2">
<button class="px-3 py-2 rounded-lg bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 text-xs font-bold transition-all dark:bg-white/5 dark:border-white/10 dark:text-gray-300 flex items-center justify-center gap-1">
<span class="material-symbols-outlined text-[16px]">edit</span>
                                    Edit
                                </button>
<button class="px-3 py-2 rounded-lg bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 text-xs font-bold transition-all dark:bg-white/5 dark:border-white/10 dark:text-gray-300 flex items-center justify-center gap-1">
<span class="material-symbols-outlined text-[16px]">visibility</span>
                                    View
                                </button>
<button class="col-span-2 px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 text-gray-600 hover:text-primary hover:border-primary/20 hover:bg-primary/5 text-xs font-bold transition-all dark:bg-white/5 dark:border-white/10 dark:text-gray-400 flex items-center justify-center gap-1">
<span class="material-symbols-outlined text-[16px]">content_copy</span>
                                    Duplicate Exam
                                </button>
</div>
</div>
</div>
<div class="bg-white dark:bg-[#1a0a0a] rounded-xl border border-gray-200 dark:border-white/10 overflow-hidden shadow-sm hover:shadow-md transition-shadow group">
<div class="p-5 flex flex-col h-full">
<div class="flex items-start justify-between mb-4">
<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
<span class="w-1.5 h-1.5 rounded-full bg-amber-600 mr-1.5"></span>
                                    Draft
                                </span>
<button class="p-1 text-gray-400 hover:text-gray-600">
<span class="material-symbols-outlined">more_vert</span>
</button>
</div>
<div class="mb-4">
<h3 class="text-base font-bold text-gray-900 dark:text-white group-hover:text-primary transition-colors">Specialization: Biological Science Mock 1</h3>
<p class="text-xs text-gray-500 mt-1 uppercase tracking-wider font-semibold">Specialization (Major)</p>
</div>
<div class="flex items-center gap-4 text-xs text-gray-500 mb-6 pb-6 border-b border-gray-100 dark:border-white/5">
<div class="flex items-center gap-1">
<span class="material-symbols-outlined text-[16px]">quiz</span>
<span>75 Questions</span>
</div>
<div class="flex items-center gap-1">
<span class="material-symbols-outlined text-[16px]">schedule</span>
<span>90 min</span>
</div>
</div>
<div class="mt-auto grid grid-cols-2 gap-2">
<button class="px-3 py-2 rounded-lg bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 text-xs font-bold transition-all dark:bg-white/5 dark:border-white/10 dark:text-gray-300 flex items-center justify-center gap-1">
<span class="material-symbols-outlined text-[16px]">edit</span>
                                    Resume
                                </button>
<button class="px-3 py-2 rounded-lg bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 text-xs font-bold transition-all dark:bg-white/5 dark:border-white/10 dark:text-gray-300 flex items-center justify-center gap-1">
<span class="material-symbols-outlined text-[16px]">visibility</span>
                                    Preview
                                </button>
<button class="col-span-2 px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 text-gray-600 hover:text-primary hover:border-primary/20 hover:bg-primary/5 text-xs font-bold transition-all dark:bg-white/5 dark:border-white/10 dark:text-gray-400 flex items-center justify-center gap-1">
<span class="material-symbols-outlined text-[16px]">content_copy</span>
                                    Duplicate Exam
                                </button>
</div>
</div>
</div>
<div class="bg-white dark:bg-[#1a0a0a] rounded-xl border border-gray-200 dark:border-white/10 overflow-hidden shadow-sm hover:shadow-md transition-shadow group border-l-4 border-l-primary/20">
<div class="p-5 flex flex-col h-full">
<div class="flex items-start justify-between mb-4">
<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
<span class="w-1.5 h-1.5 rounded-full bg-green-600 mr-1.5"></span>
                                    Live
                                </span>
<button class="p-1 text-gray-400 hover:text-gray-600">
<span class="material-symbols-outlined">more_vert</span>
</button>
</div>
<div class="mb-4">
<h3 class="text-base font-bold text-gray-900 dark:text-white group-hover:text-primary transition-colors">LET Foundation: Child and Adolescent Development</h3>
<p class="text-xs text-gray-500 mt-1 uppercase tracking-wider font-semibold">Professional Education</p>
</div>
<div class="flex items-center gap-4 text-xs text-gray-500 mb-6 pb-6 border-b border-gray-100 dark:border-white/5">
<div class="flex items-center gap-1">
<span class="material-symbols-outlined text-[16px]">quiz</span>
<span>100 Questions</span>
</div>
<div class="flex items-center gap-1">
<span class="material-symbols-outlined text-[16px]">schedule</span>
<span>120 min</span>
</div>
</div>
<div class="mt-auto grid grid-cols-2 gap-2">
<button class="px-3 py-2 rounded-lg bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 text-xs font-bold transition-all dark:bg-white/5 dark:border-white/10 dark:text-gray-300 flex items-center justify-center gap-1">
<span class="material-symbols-outlined text-[16px]">edit</span>
                                    Edit
                                </button>
<button class="px-3 py-2 rounded-lg bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 text-xs font-bold transition-all dark:bg-white/5 dark:border-white/10 dark:text-gray-300 flex items-center justify-center gap-1">
<span class="material-symbols-outlined text-[16px]">visibility</span>
                                    View
                                </button>
<button class="col-span-2 px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 text-gray-600 hover:text-primary hover:border-primary/20 hover:bg-primary/5 text-xs font-bold transition-all dark:bg-white/5 dark:border-white/10 dark:text-gray-400 flex items-center justify-center gap-1">
<span class="material-symbols-outlined text-[16px]">content_copy</span>
                                    Duplicate Exam
                                </button>
</div>
</div>
</div>
<div class="bg-white dark:bg-[#1a0a0a] rounded-xl border border-gray-200 dark:border-white/10 overflow-hidden shadow-sm opacity-75 hover:opacity-100 transition-all group">
<div class="p-5 flex flex-col h-full">
<div class="flex items-start justify-between mb-4">
<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-gray-400">
<span class="w-1.5 h-1.5 rounded-full bg-gray-600 mr-1.5"></span>
                                    Archived
                                </span>
<button class="p-1 text-gray-400 hover:text-gray-600">
<span class="material-symbols-outlined">more_vert</span>
</button>
</div>
<div class="mb-4">
<h3 class="text-base font-bold text-gray-900 dark:text-white group-hover:text-primary transition-colors">Old Curriculum Mock: LET 2022</h3>
<p class="text-xs text-gray-500 mt-1 uppercase tracking-wider font-semibold">General Education</p>
</div>
<div class="flex items-center gap-4 text-xs text-gray-500 mb-6 pb-6 border-b border-gray-100 dark:border-white/5">
<div class="flex items-center gap-1">
<span class="material-symbols-outlined text-[16px]">quiz</span>
<span>200 Questions</span>
</div>
<div class="flex items-center gap-1">
<span class="material-symbols-outlined text-[16px]">schedule</span>
<span>240 min</span>
</div>
</div>
<div class="mt-auto grid grid-cols-2 gap-2">
<button class="px-3 py-2 rounded-lg bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 text-xs font-bold transition-all dark:bg-white/5 dark:border-white/10 dark:text-gray-300 flex items-center justify-center gap-1">
<span class="material-symbols-outlined text-[16px]">restore</span>
                                    Restore
                                </button>
<button class="px-3 py-2 rounded-lg bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 text-xs font-bold transition-all dark:bg-white/5 dark:border-white/10 dark:text-gray-300 flex items-center justify-center gap-1">
<span class="material-symbols-outlined text-[16px]">visibility</span>
                                    View
                                </button>
<button class="col-span-2 px-3 py-2 rounded-lg bg-red-50 border border-red-100 text-red-600 hover:bg-red-100 text-xs font-bold transition-all flex items-center justify-center gap-1">
<span class="material-symbols-outlined text-[16px]">delete</span>
                                    Delete Permanently
                                </button>
</div>
</div>
</div>
<button class="bg-gray-50/50 dark:bg-white/[0.02] rounded-xl border-2 border-dashed border-gray-300 dark:border-white/10 p-5 flex flex-col items-center justify-center text-gray-500 hover:text-primary hover:border-primary/50 hover:bg-primary/[0.02] transition-all min-h-[300px] group">
<div class="bg-white dark:bg-[#1a0a0a] p-4 rounded-full shadow-sm mb-4 group-hover:scale-110 transition-transform">
<span class="material-symbols-outlined text-primary text-[32px]">add</span>
</div>
<p class="font-bold text-sm">Create New Mock Exam</p>
<p class="text-xs text-gray-400 mt-1 px-8 text-center">Start from scratch or use a predefined template</p>
</button>
</div>
</div>
</div>
</main>
</div>

</body></html>

<!-- Student Performance Dashboard -->
<!DOCTYPE html>
<html class="light" lang="en"><head>
<meta charset="utf-8"/>
<meta content="width=device-width, initial-scale=1.0" name="viewport"/>
<title>Create Mock Exam - Normalite Admin</title>
<link href="https://fonts.googleapis.com" rel="preconnect"/>
<link crossorigin="" href="https://fonts.gstatic.com" rel="preconnect"/>
<link href="https://fonts.googleapis.com/css2?family=Lexend:wght@100..900&amp;family=Noto+Sans:wght@100..900&amp;display=swap" rel="stylesheet"/>
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet"/>
<script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
<script id="tailwind-config">
        tailwind.config = {
            darkMode: "class",
            theme: {
                extend: {
                    colors: {
                        "primary": "#800000",
                        "accent": "#F59E0B",
                        "background-light": "#f8f5f5",
                        "background-dark": "#230f0f",
                    },
                    fontFamily: {
                        "display": ["Lexend", "sans-serif"],
                        "body": ["Noto Sans", "sans-serif"],
                    },
                    borderRadius: {"DEFAULT": "0.375rem", "lg": "0.5rem", "xl": "0.75rem", "2xl": "1rem", "full": "9999px"},
                },
            },
        }
    </script>
<style>
        ::-webkit-scrollbar {
            width: 8px;
            height: 8px;
        }
        ::-webkit-scrollbar-track {
            background: transparent; 
        }
        ::-webkit-scrollbar-thumb {
            background: #d1d5db; 
            border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb:hover {
            background: #9ca3af; 
        }
    </style>
</head>
<body class="bg-background-light dark:bg-background-dark text-[#1d0c0c] dark:text-white font-display overflow-hidden">
<div class="flex h-screen w-full">
<aside class="flex w-64 flex-col border-r border-[#e5e7eb] bg-white dark:bg-[#1a0a0a] dark:border-[#3a1a1a] transition-all duration-300 hidden md:flex shrink-0 z-20">
<div class="flex h-full flex-col justify-between p-4">
<div class="flex flex-col gap-6">
<div class="flex items-center gap-3 px-2 py-2">
<div class="bg-center bg-no-repeat bg-cover rounded-full h-10 w-10 shadow-sm border border-primary/20" style='background-image: url("https://lh3.googleusercontent.com/aida-public/AB6AXuDRPPNAtErCq7KnUYhj2JsmJNhkhexjuGMyftx05EykHw3q1BlzO-71-JUqsyQSFSiag1qAKfi6bcA9G4HUgLH1lLaFzKMl9DKsXWwXV0LdNJ02QNwnvh0WdIdFpy2zVJg73wjkd-PXjqbBElMEF5bOGlukZ5tUK9GGdjXWh5MWEDuPjDjM55USlSs5AGGZgVZmG8pOwiXYtj1yKgNzA-AvvZAO9x3_VXoFCpwqbuUsTJFM7b4mNxI7kjy_2gqMFqaI0pkK4DcIYkVd");'></div>
<div class="flex flex-col">
<h1 class="text-primary text-lg font-bold leading-tight tracking-tight">Normalite</h1>
<p class="text-gray-500 text-xs font-normal">Admin Portal</p>
</div>
</div>
<nav class="flex flex-col gap-1">
<a class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 hover:bg-gray-50 hover:text-primary dark:text-gray-300 dark:hover:bg-white/5 transition-colors" href="#">
<span class="material-symbols-outlined text-[20px]">dashboard</span>
<p class="text-sm font-medium">Dashboard</p>
</a>
<a class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 hover:bg-gray-50 hover:text-primary dark:text-gray-300 dark:hover:bg-white/5 transition-colors" href="#">
<span class="material-symbols-outlined text-[20px]">library_books</span>
<p class="text-sm font-medium">Subjects</p>
</a>
<a class="relative flex items-center gap-3 px-3 py-2.5 rounded-lg bg-primary/10 text-primary dark:text-red-400 dark:bg-red-900/10 transition-colors" href="#">
<div class="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 bg-primary dark:bg-red-400 rounded-r-full"></div>
<span class="material-symbols-outlined text-[20px] font-variation-settings-'FILL'1">assignment</span>
<p class="text-sm font-medium">Exams</p>
</a>
<a class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 hover:bg-gray-50 hover:text-primary dark:text-gray-300 dark:hover:bg-white/5 transition-colors" href="#">
<span class="material-symbols-outlined text-[20px]">quiz</span>
<p class="text-sm font-medium">Questions Bank</p>
</a>
<a class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 hover:bg-gray-50 hover:text-primary dark:text-gray-300 dark:hover:bg-white/5 transition-colors" href="#">
<span class="material-symbols-outlined text-[20px]">style</span>
<p class="text-sm font-medium">Flashcards</p>
</a>
<a class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 hover:bg-gray-50 hover:text-primary dark:text-gray-300 dark:hover:bg-white/5 transition-colors" href="#">
<span class="material-symbols-outlined text-[20px]">group</span>
<p class="text-sm font-medium">Users</p>
</a>
<a class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 hover:bg-gray-50 hover:text-primary dark:text-gray-300 dark:hover:bg-white/5 transition-colors" href="#">
<span class="material-symbols-outlined text-[20px]">bar_chart</span>
<p class="text-sm font-medium">Reports</p>
</a>
<a class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 hover:bg-gray-50 hover:text-primary dark:text-gray-300 dark:hover:bg-white/5 transition-colors" href="#">
<span class="material-symbols-outlined text-[20px]">import_export</span>
<p class="text-sm font-medium">Import / Export</p>
</a>
<a class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 hover:bg-gray-50 hover:text-primary dark:text-gray-300 dark:hover:bg-white/5 transition-colors" href="#">
<span class="material-symbols-outlined text-[20px]">settings</span>
<p class="text-sm font-medium">Settings</p>
</a>
</nav>
</div>
<div class="flex flex-col gap-4 border-t border-gray-100 pt-4 dark:border-white/10">
<div class="flex items-center gap-3 px-2">
<div class="h-9 w-9 rounded-full bg-gray-200 bg-cover bg-center" style='background-image: url("https://lh3.googleusercontent.com/aida-public/AB6AXuDlj7X3FeByZgwcrzsXQJwePv-4yl8HA3bmTcnNF5lOgngG9vpjm_kyYznzAPZgPVIZ-iMHlmeLbCxxpq7CR0YM-1BmepRG_eeyil5lqU2SlUhs9CHW8_FrpUtQdHmoXzl8DTzoy5_otYgexhRADm4-hnUyPM1rjk5okTceIRQral4XdpNixjnPxWisoyjD-rAs9h-1yU_deBaVQXXGAgGafWOKjyID8Bj0sZqv-7JuPA06AKS6bvqdQNAoiXA1T1tArTvVkGymOOhr");'></div>
<div class="flex flex-col overflow-hidden">
<p class="text-sm font-medium text-gray-900 dark:text-white truncate">Admin User</p>
<p class="text-xs text-gray-500 truncate">Administrator</p>
</div>
</div>
<button class="flex w-full items-center gap-2 justify-center rounded-lg h-9 px-4 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 text-sm font-semibold transition-colors dark:bg-white/5 dark:border-white/10 dark:text-gray-300 dark:hover:bg-white/10">
<span class="material-symbols-outlined text-[18px]">logout</span>
<span>Log Out</span>
</button>
</div>
</div>
</aside>
<main class="flex-1 flex flex-col h-screen overflow-hidden bg-background-light dark:bg-background-dark">
<div class="md:hidden flex shrink-0 items-center justify-between p-4 bg-white dark:bg-[#1a0a0a] border-b border-gray-200 dark:border-white/10">
<div class="flex items-center gap-2">
<div class="bg-primary/10 p-1.5 rounded-md">
<span class="material-symbols-outlined text-primary">school</span>
</div>
<span class="font-bold text-lg text-primary">Normalite Admin</span>
</div>
<button class="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-white/10">
<span class="material-symbols-outlined">menu</span>
</button>
</div>
<header class="bg-white dark:bg-[#1a0a0a] border-b border-gray-200 dark:border-white/10 px-6 py-6 shrink-0 z-10">
<div class="container mx-auto max-w-5xl">
<div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
<div>
<div class="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-1">
<a class="hover:text-primary transition-colors" href="#">Exams</a>
<span class="material-symbols-outlined text-[12px]">chevron_right</span>
<span class="text-gray-900 dark:text-white font-medium">Create New</span>
</div>
<h2 class="text-2xl font-bold text-gray-900 dark:text-white">Admin Mock Exam Creator</h2>
<p class="text-sm text-gray-500 dark:text-gray-400 mt-1">Design and publish comprehensive mock exams for students.</p>
</div>
<div class="flex items-center gap-3">
<button class="px-4 py-2 rounded-lg bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 text-sm font-medium transition-colors dark:bg-white/5 dark:border-white/10 dark:text-gray-300">
                            Discard
                        </button>
<button class="px-4 py-2 rounded-lg bg-gray-100 text-gray-900 hover:bg-gray-200 text-sm font-medium transition-colors dark:bg-white/10 dark:text-white dark:hover:bg-white/20">
                            Save Draft
                        </button>
<button class="px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary/90 text-sm font-medium transition-colors shadow-sm shadow-primary/20 flex items-center gap-2">
<span class="material-symbols-outlined text-[18px]">publish</span>
                            Publish Exam
                        </button>
</div>
</div>
</div>
</header>
<div class="flex-1 overflow-y-auto">
<div class="container mx-auto max-w-5xl px-6 py-8 pb-20">
<form class="flex flex-col gap-8">
<div class="flex flex-col gap-4">
<div class="flex items-center gap-2 text-primary">
<span class="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-xs font-bold">1</span>
<h3 class="text-sm font-bold uppercase tracking-wide">General Information</h3>
</div>
<div class="bg-white dark:bg-[#1a0a0a] rounded-xl border border-gray-200 dark:border-white/10 p-6 shadow-sm">
<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
<div class="md:col-span-2">
<label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Exam Title</label>
<input class="w-full rounded-lg border-gray-300 dark:border-white/10 dark:bg-white/5 focus:border-primary focus:ring-primary text-sm shadow-sm" placeholder="e.g., LET 2024 Comprehensive Mock: Professional Education" type="text"/>
</div>
<div>
<label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Category</label>
<select class="w-full rounded-lg border-gray-300 dark:border-white/10 dark:bg-white/5 focus:border-primary focus:ring-primary text-sm shadow-sm">
<option>Select a category...</option>
<option>Professional Education</option>
<option>General Education</option>
<option>Specialization (Major)</option>
</select>
</div>
<div>
<label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Duration (Minutes)</label>
<div class="relative">
<input class="w-full rounded-lg border-gray-300 dark:border-white/10 dark:bg-white/5 focus:border-primary focus:ring-primary text-sm shadow-sm pr-12" placeholder="120" type="number"/>
<span class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">min</span>
</div>
</div>
<div class="md:col-span-2">
<label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Exam Sections <span class="text-gray-400 font-normal">(Questions will be grouped by these tags)</span></label>
<div class="flex items-center gap-2 p-2 border border-gray-300 dark:border-white/10 rounded-lg bg-gray-50 dark:bg-white/5">
<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-white dark:bg-[#1a0a0a] border border-gray-200 dark:border-white/10 text-xs font-medium text-gray-700 dark:text-gray-300">
                                            Child Development
                                            <button class="text-gray-400 hover:text-red-500" type="button"><span class="material-symbols-outlined text-[14px]">close</span></button>
</span>
<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-white dark:bg-[#1a0a0a] border border-gray-200 dark:border-white/10 text-xs font-medium text-gray-700 dark:text-gray-300">
                                            Curriculum Design
                                            <button class="text-gray-400 hover:text-red-500" type="button"><span class="material-symbols-outlined text-[14px]">close</span></button>
</span>
<input class="bg-transparent border-none text-sm focus:ring-0 p-1 flex-1 min-w-[120px]" placeholder="Type &amp; press Enter to add section..." type="text"/>
</div>
</div>
<div class="md:col-span-2">
<label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Description &amp; Instructions</label>
<textarea class="w-full rounded-lg border-gray-300 dark:border-white/10 dark:bg-white/5 focus:border-primary focus:ring-primary text-sm shadow-sm" placeholder="Provide instructions for the students taking this mock exam..." rows="3"></textarea>
</div>
</div>
</div>
</div>
<div class="flex flex-col gap-4">
<div class="flex items-center justify-between">
<div class="flex items-center gap-2 text-primary">
<span class="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-xs font-bold">2</span>
<h3 class="text-sm font-bold uppercase tracking-wide">Question Management</h3>
</div>
<div class="flex items-center gap-4">
<button class="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-primary/20 bg-white text-primary hover:bg-primary/5 text-xs font-bold transition-all" type="button">
<span class="material-symbols-outlined text-[18px]">upload_file</span>
                                    Bulk Import Questions
                                </button>
<div class="text-xs text-gray-500">
                                    Total Questions: <span class="font-bold text-gray-900 dark:text-white">1</span>
</div>
</div>
</div>
<div class="flex flex-col gap-6">
<div class="border-b border-gray-200 dark:border-white/10">
<nav class="flex gap-6">
<button class="border-b-2 border-primary pb-3 px-1 text-sm font-bold text-primary flex items-center gap-2" type="button">
                                        Child Development
                                        <span class="bg-primary/10 text-primary text-[10px] px-1.5 py-0.5 rounded-full">1</span>
</button>
<button class="border-b-2 border-transparent pb-3 px-1 text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition-colors flex items-center gap-2" type="button">
                                        Curriculum Design
                                        <span class="bg-gray-100 dark:bg-white/10 text-gray-500 text-[10px] px-1.5 py-0.5 rounded-full">0</span>
</button>
<button class="border-b-2 border-transparent pb-3 px-1 text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition-colors flex items-center gap-2" type="button">
                                        No Section
                                        <span class="bg-gray-100 dark:bg-white/10 text-gray-500 text-[10px] px-1.5 py-0.5 rounded-full">0</span>
</button>
</nav>
</div>
<div class="space-y-6">
<div class="bg-white dark:bg-[#1a0a0a] rounded-xl border border-gray-200 dark:border-white/10 shadow-sm relative group overflow-hidden">
<div class="bg-gray-50 dark:bg-white/5 px-6 py-3 border-b border-gray-200 dark:border-white/10 flex justify-between items-center">
<div class="flex items-center gap-3">
<span class="text-sm font-bold text-gray-700 dark:text-gray-200">Question #1</span>
<span class="text-[10px] uppercase font-bold tracking-wider text-primary bg-primary/5 px-2 py-0.5 rounded">Child Development</span>
</div>
<div class="flex items-center gap-2">
<button class="p-1 text-gray-400 hover:text-blue-600 transition-colors" title="Duplicate" type="button">
<span class="material-symbols-outlined text-[18px]">content_copy</span>
</button>
<button class="p-1 text-gray-400 hover:text-red-600 transition-colors" title="Delete" type="button">
<span class="material-symbols-outlined text-[18px]">delete</span>
</button>
<button class="p-1 text-gray-400 hover:text-gray-600 transition-colors" type="button">
<span class="material-symbols-outlined text-[18px]">expand_less</span>
</button>
</div>
</div>
<div class="p-6 grid grid-cols-1 gap-6">
<div>
<label class="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Question Text</label>
<div class="flex flex-col gap-3">
<textarea class="w-full rounded-lg border-gray-300 dark:border-white/10 dark:bg-white/5 focus:border-primary focus:ring-primary text-sm shadow-sm font-medium transition-shadow" placeholder="Enter the question here..." rows="3">Identify the learning theory depicted in the attached diagram.</textarea>
<div class="flex items-center justify-between border-b border-gray-100 dark:border-white/5 pb-3">
<div class="flex items-center gap-1">
<button class="p-1.5 text-gray-400 hover:text-gray-700 dark:text-gray-500 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/10 rounded transition-colors" title="Bold" type="button">
<span class="material-symbols-outlined text-[18px]">format_bold</span>
</button>
<button class="p-1.5 text-gray-400 hover:text-gray-700 dark:text-gray-500 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/10 rounded transition-colors" title="Italic" type="button">
<span class="material-symbols-outlined text-[18px]">format_italic</span>
</button>
<button class="p-1.5 text-gray-400 hover:text-gray-700 dark:text-gray-500 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/10 rounded transition-colors" title="Underline" type="button">
<span class="material-symbols-outlined text-[18px]">format_underlined</span>
</button>
</div>
<button class="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-primary/20 bg-white dark:bg-white/5 text-primary hover:bg-primary/5 dark:hover:bg-white/10 text-xs font-bold transition-all shadow-sm" type="button">
<span class="material-symbols-outlined text-[18px]">add_photo_alternate</span>
                                                        Upload Image
                                                    </button>
</div>
<div class="flex items-start gap-4 p-3 rounded-lg bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 border-dashed">
<div class="h-16 w-16 bg-white dark:bg-white/10 rounded-md border border-gray-200 dark:border-white/10 flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
<span class="material-symbols-outlined text-gray-300 text-[32px]">image</span>
</div>
<div class="flex-1">
<div class="flex items-center justify-between">
<div>
<p class="text-sm font-medium text-gray-900 dark:text-white">learning_theories_chart.png</p>
<p class="text-xs text-gray-500">245 KB</p>
</div>
</div>
<div class="flex items-center gap-3 mt-2">
<button class="text-xs font-semibold text-gray-600 hover:text-primary dark:text-gray-400 dark:hover:text-white transition-colors" type="button">Replace</button>
<span class="text-gray-300">|</span>
<button class="text-xs font-semibold text-red-500 hover:text-red-700 transition-colors" type="button">Remove</button>
</div>
</div>
</div>
</div>
</div>
<div>
<label class="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                                                Options 
                                                <span class="text-[10px] font-normal normal-case bg-green-100 text-green-700 px-1.5 py-0.5 rounded">Select the radio button to mark correct answer</span>
</label>
<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
<div class="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-transparent hover:border-gray-300 transition-colors">
<div class="flex items-center h-5">
<input class="focus:ring-primary h-4 w-4 text-primary border-gray-300" id="q1-opt-a" name="q1-correct" type="radio"/>
</div>
<div class="flex-1">
<span class="text-xs font-bold text-gray-400 mb-1 block">Option A</span>
<input class="w-full border-0 p-0 text-sm focus:ring-0 bg-transparent placeholder-gray-400" placeholder="Type answer..." type="text"/>
</div>
</div>
<div class="flex items-center gap-3 p-3 rounded-lg border border-green-200 bg-green-50/50 dark:bg-green-900/10 dark:border-green-800 transition-colors">
<div class="flex items-center h-5">
<input checked="" class="focus:ring-primary h-4 w-4 text-primary border-gray-300" id="q1-opt-b" name="q1-correct" type="radio"/>
</div>
<div class="flex-1">
<span class="text-xs font-bold text-green-600 mb-1 block">Option B (Correct)</span>
<input class="w-full border-0 p-0 text-sm focus:ring-0 bg-transparent placeholder-gray-400 text-gray-900 dark:text-white" type="text" value="Piaget's Theory of Cognitive Development"/>
</div>
</div>
<div class="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-transparent hover:border-gray-300 transition-colors">
<div class="flex items-center h-5">
<input class="focus:ring-primary h-4 w-4 text-primary border-gray-300" id="q1-opt-c" name="q1-correct" type="radio"/>
</div>
<div class="flex-1">
<span class="text-xs font-bold text-gray-400 mb-1 block">Option C</span>
<input class="w-full border-0 p-0 text-sm focus:ring-0 bg-transparent placeholder-gray-400" placeholder="Type answer..." type="text"/>
</div>
</div>
<div class="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-transparent hover:border-gray-300 transition-colors">
<div class="flex items-center h-5">
<input class="focus:ring-primary h-4 w-4 text-primary border-gray-300" id="q1-opt-d" name="q1-correct" type="radio"/>
</div>
<div class="flex-1">
<span class="text-xs font-bold text-gray-400 mb-1 block">Option D</span>
<input class="w-full border-0 p-0 text-sm focus:ring-0 bg-transparent placeholder-gray-400" placeholder="Type answer..." type="text"/>
</div>
</div>
</div>
</div>
</div>
</div>
<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
<button class="py-6 border-2 border-dashed border-gray-300 dark:border-white/10 rounded-xl flex flex-col items-center justify-center text-gray-500 hover:text-primary hover:border-primary/50 hover:bg-gray-50 dark:hover:bg-white/5 transition-all group" type="button">
<div class="bg-gray-100 dark:bg-white/10 p-3 rounded-full mb-2 group-hover:bg-primary/10 transition-colors">
<span class="material-symbols-outlined text-[24px]">add</span>
</div>
<span class="font-semibold text-sm">Add New Question</span>
</button>
<button class="py-6 border-2 border-dashed border-primary/20 rounded-xl flex flex-col items-center justify-center text-primary/60 hover:text-primary hover:border-primary/50 hover:bg-primary/[0.02] dark:hover:bg-white/5 transition-all group" type="button">
<div class="bg-primary/5 p-3 rounded-full mb-2 group-hover:bg-primary/10 transition-colors">
<span class="material-symbols-outlined text-[24px]">library_add</span>
</div>
<span class="font-semibold text-sm">Bulk Add Questions</span>
</button>
</div>
</div>
</div>
</div>
</form>
</div>
</div>
</main>
</div>
</body></html>

<!-- Student Performance Dashboard -->
<!DOCTYPE html>
<html class="light" lang="en"><head>
<meta charset="utf-8"/>
<meta content="width=device-width, initial-scale=1.0" name="viewport"/>
<title>Admin Panel - Normalite Reviewer</title>
<link href="https://fonts.googleapis.com" rel="preconnect"/>
<link crossorigin="" href="https://fonts.gstatic.com" rel="preconnect"/>
<link href="https://fonts.googleapis.com/css2?family=Lexend:wght@100..900&amp;family=Noto+Sans:wght@100..900&amp;display=swap" rel="stylesheet"/>
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet"/>
<script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
<script id="tailwind-config">
        tailwind.config = {
            darkMode: "class",
            theme: {
                extend: {
                    colors: {
                        "primary": "#800000",
                        "accent": "#F59E0B",
                        "background-light": "#f8f5f5",
                        "background-dark": "#230f0f",
                    },
                    fontFamily: {
                        "display": ["Lexend", "sans-serif"],
                        "body": ["Noto Sans", "sans-serif"],
                    },
                    borderRadius: {"DEFAULT": "0.375rem", "lg": "0.5rem", "xl": "0.75rem", "2xl": "1rem", "full": "9999px"},
                },
            },
        }
    </script>
<style>
        ::-webkit-scrollbar {
            width: 8px;
            height: 8px;
        }
        ::-webkit-scrollbar-track {
            background: transparent; 
        }
        ::-webkit-scrollbar-thumb {
            background: #d1d5db; 
            border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb:hover {
            background: #9ca3af; 
        }
    </style>
</head>
<body class="bg-background-light dark:bg-background-dark text-[#1d0c0c] dark:text-white font-display overflow-hidden">
<div class="flex h-screen w-full">
<aside class="flex w-64 flex-col border-r border-[#e5e7eb] bg-white dark:bg-[#1a0a0a] dark:border-[#3a1a1a] transition-all duration-300 hidden md:flex">
<div class="flex h-full flex-col justify-between p-4">
<div class="flex flex-col gap-6">
<div class="flex items-center gap-3 px-2 py-2">
<div class="bg-center bg-no-repeat bg-cover rounded-full h-10 w-10 shadow-sm border border-primary/20" data-alt="University Logo showing a shield or crest" style='background-image: url("https://lh3.googleusercontent.com/aida-public/AB6AXuDRPPNAtErCq7KnUYhj2JsmJNhkhexjuGMyftx05EykHw3q1BlzO-71-JUqsyQSFSiag1qAKfi6bcA9G4HUgLH1lLaFzKMl9DKsXWwXV0LdNJ02QNwnvh0WdIdFpy2zVJg73wjkd-PXjqbBElMEF5bOGlukZ5tUK9GGdjXWh5MWEDuPjDjM55USlSs5AGGZgVZmG8pOwiXYtj1yKgNzA-AvvZAO9x3_VXoFCpwqbuUsTJFM7b4mNxI7kjy_2gqMFqaI0pkK4DcIYkVd");'>
</div>
<div class="flex flex-col">
<h1 class="text-primary text-lg font-bold leading-tight tracking-tight">Normalite</h1>
<p class="text-gray-500 text-xs font-normal">Admin Portal</p>
</div>
</div>
<nav class="flex flex-col gap-1">
<a class="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-primary/10 text-primary group transition-colors" href="#">
<span class="material-symbols-outlined text-[20px] font-variation-settings-'FILL'1">dashboard</span>
<p class="text-sm font-medium">Dashboard</p>
</a>
<a class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 hover:bg-gray-50 hover:text-primary dark:text-gray-300 dark:hover:bg-white/5 transition-colors" href="#">
<span class="material-symbols-outlined text-[20px]">library_books</span>
<p class="text-sm font-medium">Subjects</p>
</a>
<a class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 hover:bg-gray-50 hover:text-primary dark:text-gray-300 dark:hover:bg-white/5 transition-colors" href="#">
<span class="material-symbols-outlined text-[20px]">assignment</span>
<p class="text-sm font-medium">Exams</p>
</a>
<a class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 hover:bg-gray-50 hover:text-primary dark:text-gray-300 dark:hover:bg-white/5 transition-colors" href="#">
<span class="material-symbols-outlined text-[20px]">quiz</span>
<p class="text-sm font-medium">Questions Bank</p>
</a>
<a class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 hover:bg-gray-50 hover:text-primary dark:text-gray-300 dark:hover:bg-white/5 transition-colors" href="#">
<span class="material-symbols-outlined text-[20px]">style</span>
<p class="text-sm font-medium">Flashcards</p>
</a>
<a class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 hover:bg-gray-50 hover:text-primary dark:text-gray-300 dark:hover:bg-white/5 transition-colors" href="#">
<span class="material-symbols-outlined text-[20px]">group</span>
<p class="text-sm font-medium">Users</p>
</a>
<a class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 hover:bg-gray-50 hover:text-primary dark:text-gray-300 dark:hover:bg-white/5 transition-colors" href="#">
<span class="material-symbols-outlined text-[20px]">bar_chart</span>
<p class="text-sm font-medium">Reports</p>
</a>
<a class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 hover:bg-gray-50 hover:text-primary dark:text-gray-300 dark:hover:bg-white/5 transition-colors" href="#">
<span class="material-symbols-outlined text-[20px]">import_export</span>
<p class="text-sm font-medium">Import / Export</p>
</a>
<a class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 hover:bg-gray-50 hover:text-primary dark:text-gray-300 dark:hover:bg-white/5 transition-colors" href="#">
<span class="material-symbols-outlined text-[20px]">settings</span>
<p class="text-sm font-medium">Settings</p>
</a>
</nav>
</div>
<div class="flex flex-col gap-4 border-t border-gray-100 pt-4 dark:border-white/10">
<div class="flex items-center gap-3 px-2">
<div class="h-9 w-9 rounded-full bg-gray-200 bg-cover bg-center border border-gray-300" data-alt="Admin profile picture" style='background-image: url("https://lh3.googleusercontent.com/aida-public/AB6AXuDlj7X3FeByZgwcrzsXQJwePv-4yl8HA3bmTcnNF5lOgngG9vpjm_kyYznzAPZgPVIZ-iMHlmeLbCxxpq7CR0YM-1BmepRG_eeyil5lqU2SlUhs9CHW8_FrpUtQdHmoXzl8DTzoy5_otYgexhRADm4-hnUyPM1rjk5okTceIRQral4XdpNixjnPxWisoyjD-rAs9h-1yU_deBaVQXXGAgGafWOKjyID8Bj0sZqv-7JuPA06AKS6bvqdQNAoiXA1T1tArTvVkGymOOhr");'>
</div>
<div class="flex flex-col overflow-hidden">
<p class="text-sm font-medium text-gray-900 dark:text-white truncate">System Admin</p>
<p class="text-xs text-gray-500 truncate">Administrator</p>
</div>
</div>
<button class="flex w-full items-center gap-2 justify-center rounded-lg h-9 px-4 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 text-sm font-semibold transition-colors dark:bg-white/5 dark:border-white/10 dark:text-gray-300 dark:hover:bg-white/10">
<span class="material-symbols-outlined text-[18px]">logout</span>
<span>Log Out</span>
</button>
</div>
</div>
</aside>
<main class="flex-1 overflow-y-auto bg-background-light dark:bg-background-dark">
<div class="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-8">
<div class="md:hidden flex items-center justify-between pb-4">
<div class="flex items-center gap-2">
<div class="bg-primary/10 p-1.5 rounded-md">
<span class="material-symbols-outlined text-primary">admin_panel_settings</span>
</div>
<span class="font-bold text-lg text-primary">Normalite Admin</span>
</div>
<button class="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-white/10">
<span class="material-symbols-outlined">menu</span>
</button>
</div>
<header class="flex flex-col gap-2">
<div class="flex flex-wrap items-end justify-between gap-4">
<div>
<h1 class="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white tracking-tight">Admin Dashboard</h1>
<p class="text-gray-500 dark:text-gray-400 mt-2 text-base">Overview of user statistics and question management.</p>
</div>
<div class="flex items-center gap-3">
<button class="h-10 w-10 rounded-full bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 flex items-center justify-center text-gray-500 hover:text-primary transition-colors relative">
<span class="material-symbols-outlined">notifications</span>
<span class="absolute top-2 right-2 h-2 w-2 rounded-full bg-red-500 border border-white"></span>
</button>
<button class="hidden sm:flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-white hover:bg-primary/90 transition-colors shadow-sm">
<span class="material-symbols-outlined text-[20px]">add_circle</span>
<span class="text-sm font-bold">New Question</span>
</button>
</div>
</div>
</header>
<div class="bg-blue-50 border border-blue-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm dark:bg-blue-900/20 dark:border-blue-700/50">
<div class="flex items-start sm:items-center gap-4">
<div class="bg-blue-100 p-2 rounded-full text-blue-700 dark:bg-blue-800 dark:text-blue-200 mt-1 sm:mt-0">
<span class="material-symbols-outlined">dns</span>
</div>
<div>
<p class="font-bold text-blue-900 dark:text-blue-100 text-sm">System Notice</p>
<p class="text-blue-800 dark:text-blue-200/80 text-sm mt-0.5">Scheduled database maintenance on Sunday at 2:00 AM.</p>
</div>
</div>
<button class="text-xs font-bold text-blue-800 hover:text-blue-900 underline decoration-blue-800/30 hover:decoration-blue-900 dark:text-blue-200 dark:hover:text-blue-100 whitespace-nowrap">Dismiss</button>
</div>
<section aria-label="Admin Stats">
<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
<div class="bg-white dark:bg-[#1a0a0a] rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-white/5 flex flex-col gap-2">
<div class="flex items-center justify-between">
<div class="p-2 bg-primary/10 rounded-lg text-primary">
<span class="material-symbols-outlined">group</span>
</div>
<span class="flex items-center text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded dark:bg-green-900/20 dark:text-green-400">
<span class="material-symbols-outlined text-[14px] mr-1">trending_up</span> +12%
                                </span>
</div>
<div class="mt-2">
<h3 class="text-3xl font-bold text-gray-900 dark:text-white">1,248</h3>
<p class="text-sm text-gray-500 dark:text-gray-400">Total Registered Students</p>
</div>
</div>
<div class="bg-white dark:bg-[#1a0a0a] rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-white/5 flex flex-col gap-2">
<div class="flex items-center justify-between">
<div class="p-2 bg-accent/10 rounded-lg text-accent">
<span class="material-symbols-outlined">library_books</span>
</div>
<span class="flex items-center text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded dark:bg-green-900/20 dark:text-green-400">
<span class="material-symbols-outlined text-[14px] mr-1">add</span> 54 new
                                </span>
</div>
<div class="mt-2">
<h3 class="text-3xl font-bold text-gray-900 dark:text-white">5,430</h3>
<p class="text-sm text-gray-500 dark:text-gray-400">Total Questions in Bank</p>
</div>
</div>
<div class="bg-white dark:bg-[#1a0a0a] rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-white/5 flex flex-col gap-2">
<div class="flex items-center justify-between">
<div class="p-2 bg-orange-100 rounded-lg text-orange-600 dark:bg-orange-900/20 dark:text-orange-400">
<span class="material-symbols-outlined">pending_actions</span>
</div>
<span class="flex items-center text-xs font-medium text-orange-600 bg-orange-50 px-2 py-1 rounded dark:bg-orange-900/20 dark:text-orange-400">
                                    Needs Attention
                                </span>
</div>
<div class="mt-2">
<h3 class="text-3xl font-bold text-gray-900 dark:text-white">18</h3>
<p class="text-sm text-gray-500 dark:text-gray-400">Reported Questions</p>
</div>
</div>
</div>
</section>
<div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
<div class="lg:col-span-2 flex flex-col gap-8">
<section class="bg-white dark:bg-[#1a0a0a] rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-white/5">
<div class="flex items-center justify-between mb-6">
<h2 class="text-xl font-bold text-gray-900 dark:text-white">Question Bank Distribution</h2>
<button class="text-primary text-sm font-semibold hover:text-primary/80">Manage Questions</button>
</div>
<div class="flex flex-col gap-5">
<div class="flex flex-col gap-1.5">
<div class="flex justify-between text-sm">
<span class="font-medium text-gray-700 dark:text-gray-300">General Education</span>
<span class="font-bold text-gray-900 dark:text-white">40% (2,172)</span>
</div>
<div class="h-3 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
<div class="h-full bg-primary rounded-full" style="width: 40%"></div>
</div>
</div>
<div class="flex flex-col gap-1.5">
<div class="flex justify-between text-sm">
<span class="font-medium text-gray-700 dark:text-gray-300">Professional Education</span>
<span class="font-bold text-gray-900 dark:text-white">35% (1,900)</span>
</div>
<div class="h-3 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
<div class="h-full bg-accent rounded-full" style="width: 35%"></div>
</div>
</div>
<div class="flex flex-col gap-1.5">
<div class="flex justify-between text-sm">
<span class="font-medium text-gray-700 dark:text-gray-300">Majorships</span>
<span class="font-bold text-gray-900 dark:text-white">25% (1,358)</span>
</div>
<div class="h-3 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
<div class="h-full bg-indigo-500 rounded-full" style="width: 25%"></div>
</div>
</div>
</div>
</section>
<section>
<div class="flex items-center justify-between mb-4">
<h2 class="text-xl font-bold text-gray-900 dark:text-white">Recent Registrations</h2>
<a class="text-primary text-sm font-semibold hover:text-primary/80" href="#">View All Users</a>
</div>
<div class="bg-white dark:bg-[#1a0a0a] rounded-xl border border-gray-200 dark:border-white/10 overflow-hidden">
<div class="overflow-x-auto">
<table class="w-full text-sm text-left">
<thead class="bg-gray-50 dark:bg-white/5 text-gray-500 uppercase font-medium text-xs">
<tr>
<th class="px-6 py-3">Student Name</th>
<th class="px-6 py-3">Major</th>
<th class="px-6 py-3">Date Joined</th>
<th class="px-6 py-3">Status</th>
</tr>
</thead>
<tbody class="divide-y divide-gray-100 dark:divide-white/5">
<tr class="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
<td class="px-6 py-4 font-medium text-gray-900 dark:text-white">Juan Dela Cruz</td>
<td class="px-6 py-4 text-gray-500">BSEd - English</td>
<td class="px-6 py-4 text-gray-500">Oct 26, 2023</td>
<td class="px-6 py-4">
<span class="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold dark:bg-green-900/20 dark:text-green-400">Active</span>
</td>
</tr>
<tr class="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
<td class="px-6 py-4 font-medium text-gray-900 dark:text-white">Maria Santos</td>
<td class="px-6 py-4 text-gray-500">BEEd - Generalist</td>
<td class="px-6 py-4 text-gray-500">Oct 25, 2023</td>
<td class="px-6 py-4">
<span class="bg-yellow-100 text-yellow-700 px-2 py-1 rounded text-xs font-bold dark:bg-yellow-900/20 dark:text-yellow-400">Pending</span>
</td>
</tr>
<tr class="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
<td class="px-6 py-4 font-medium text-gray-900 dark:text-white">Pedro Penduko</td>
<td class="px-6 py-4 text-gray-500">BSEd - Math</td>
<td class="px-6 py-4 text-gray-500">Oct 25, 2023</td>
<td class="px-6 py-4">
<span class="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold dark:bg-green-900/20 dark:text-green-400">Active</span>
</td>
</tr>
</tbody>
</table>
</div>
</div>
</section>
</div>
<div class="lg:col-span-1 flex flex-col gap-6">
<div class="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-[#5a0000] p-6 text-white shadow-lg">
<div class="relative z-10 flex flex-col gap-4">
<div class="flex items-center gap-2 text-white/80">
<span class="material-symbols-outlined">gavel</span>
<span class="text-sm font-bold uppercase tracking-wider">Action Required</span>
</div>
<div>
<h3 class="text-2xl font-bold leading-tight">18 Reported Questions</h3>
<p class="text-white/80 mt-1 text-sm">Users have flagged these items for errors.</p>
</div>
<button class="mt-2 w-full rounded-lg bg-white py-3 text-center text-sm font-bold text-primary hover:bg-gray-50 transition-colors">
                                    Review Now
                                </button>
</div>
<div class="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-white/10 blur-2xl"></div>
<div class="absolute -bottom-10 -left-6 h-40 w-40 rounded-full bg-accent/20 blur-3xl"></div>
</div>
<div class="bg-white dark:bg-[#1a0a0a] rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-white/5">
<h3 class="text-lg font-bold text-gray-900 dark:text-white mb-4">System Audit Log</h3>
<div class="flex flex-col gap-4">
<div class="flex gap-4 items-start">
<div class="flex flex-col items-center justify-center bg-gray-50 dark:bg-white/5 rounded-lg h-10 w-10 min-w-[2.5rem]">
<span class="material-symbols-outlined text-gray-500 text-sm">upload_file</span>
</div>
<div>
<h4 class="font-bold text-sm text-gray-900 dark:text-white">Bulk Upload</h4>
<p class="text-xs text-gray-500">Admin_User uploaded 50 questions to Prof Ed.</p>
<span class="text-[10px] text-gray-400 mt-1 block">2 hours ago</span>
</div>
</div>
<div class="w-full h-px bg-gray-100 dark:bg-white/5"></div>
<div class="flex gap-4 items-start">
<div class="flex flex-col items-center justify-center bg-gray-50 dark:bg-white/5 rounded-lg h-10 w-10 min-w-[2.5rem]">
<span class="material-symbols-outlined text-gray-500 text-sm">person_add</span>
</div>
<div>
<h4 class="font-bold text-sm text-gray-900 dark:text-white">New User Approval</h4>
<p class="text-xs text-gray-500">Approved 5 pending student accounts.</p>
<span class="text-[10px] text-gray-400 mt-1 block">5 hours ago</span>
</div>
</div>
</div>
<button class="w-full mt-4 py-2 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 font-medium border border-dashed border-gray-300 rounded-lg">
                                View Full Logs
                            </button>
</div>
<div class="bg-accent/10 rounded-2xl p-6 border border-accent/20">
<h3 class="text-base font-bold text-gray-900 dark:text-white mb-3">Quick Actions</h3>
<div class="flex flex-col gap-2">
<button class="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-primary dark:text-gray-300 dark:hover:text-white transition-colors">
<span class="material-symbols-outlined text-[18px]">person_add</span> Invite Faculty
                                </button>
<button class="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-primary dark:text-gray-300 dark:hover:text-white transition-colors">
<span class="material-symbols-outlined text-[18px]">download</span> Export User Data
                                </button>
<button class="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-primary dark:text-gray-300 dark:hover:text-white transition-colors">
<span class="material-symbols-outlined text-[18px]">settings_backup_restore</span> System Backup
                                </button>
</div>
</div>
</div>
</div>
</div>
</main>
</div>

</body></html>

<!-- Student Performance Dashboard -->
<!DOCTYPE html>
<html class="light" lang="en"><head>
<meta charset="utf-8"/>
<meta content="width=device-width, initial-scale=1.0" name="viewport"/>
<title>Admin Subjects - Normalite Reviewer</title>
<link href="https://fonts.googleapis.com" rel="preconnect"/>
<link crossorigin="" href="https://fonts.gstatic.com" rel="preconnect"/>
<link href="https://fonts.googleapis.com/css2?family=Lexend:wght@100..900&amp;family=Noto+Sans:wght@100..900&amp;display=swap" rel="stylesheet"/>
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet"/>
<script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
<script id="tailwind-config">
        tailwind.config = {
            darkMode: "class",
            theme: {
                extend: {
                    colors: {
                        "primary": "#800000",
                        "accent": "#F59E0B",
                        "background-light": "#f8f5f5",
                        "background-dark": "#230f0f",
                    },
                    fontFamily: {
                        "display": ["Lexend", "sans-serif"],
                        "body": ["Noto Sans", "sans-serif"],
                    },
                    borderRadius: {"DEFAULT": "0.375rem", "lg": "0.5rem", "xl": "0.75rem", "2xl": "1rem", "full": "9999px"},
                },
            },
        }
    </script>
<style>
        ::-webkit-scrollbar {
            width: 8px;
            height: 8px;
        }
        ::-webkit-scrollbar-track {
            background: transparent; 
        }
        ::-webkit-scrollbar-thumb {
            background: #d1d5db; 
            border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb:hover {
            background: #9ca3af; 
        }
    </style>
</head>
<body class="bg-background-light dark:bg-background-dark text-[#1d0c0c] dark:text-white font-display overflow-hidden">
<div class="flex h-screen w-full">
<aside class="flex w-64 flex-col border-r border-[#e5e7eb] bg-white dark:bg-[#1a0a0a] dark:border-[#3a1a1a] transition-all duration-300 hidden md:flex">
<div class="flex h-full flex-col justify-between p-4">
<div class="flex flex-col gap-6">
<div class="flex items-center gap-3 px-2 py-2">
<div class="bg-center bg-no-repeat bg-cover rounded-full h-10 w-10 shadow-sm border border-primary/20" style='background-image: url("https://lh3.googleusercontent.com/aida-public/AB6AXuDRPPNAtErCq7KnUYhj2JsmJNhkhexjuGMyftx05EykHw3q1BlzO-71-JUqsyQSFSiag1qAKfi6bcA9G4HUgLH1lLaFzKMl9DKsXWwXV0LdNJ02QNwnvh0WdIdFpy2zVJg73wjkd-PXjqbBElMEF5bOGlukZ5tUK9GGdjXWh5MWEDuPjDjM55USlSs5AGGZgVZmG8pOwiXYtj1yKgNzA-AvvZAO9x3_VXoFCpwqbuUsTJFM7b4mNxI7kjy_2gqMFqaI0pkK4DcIYkVd");'></div>
<div class="flex flex-col">
<h1 class="text-primary text-lg font-bold leading-tight tracking-tight">Normalite</h1>
<p class="text-gray-500 text-xs font-normal">Admin Portal</p>
</div>
</div>
<nav class="flex flex-col gap-1">
<a class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 hover:bg-gray-50 hover:text-primary dark:text-gray-300 dark:hover:bg-white/5 transition-colors" href="#">
<span class="material-symbols-outlined text-[20px]">dashboard</span>
<p class="text-sm font-medium">Dashboard</p>
</a>
<a class="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-primary/10 text-primary group transition-colors" href="#">
<span class="material-symbols-outlined text-[20px] font-variation-settings-'FILL'1">library_books</span>
<p class="text-sm font-medium">Subjects</p>
</a>
<a class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 hover:bg-gray-50 hover:text-primary dark:text-gray-300 dark:hover:bg-white/5 transition-colors" href="#">
<span class="material-symbols-outlined text-[20px]">assignment</span>
<p class="text-sm font-medium">Exams</p>
</a>
<a class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 hover:bg-gray-50 hover:text-primary dark:text-gray-300 dark:hover:bg-white/5 transition-colors" href="#">
<span class="material-symbols-outlined text-[20px]">quiz</span>
<p class="text-sm font-medium">Questions Bank</p>
</a>
<a class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 hover:bg-gray-50 hover:text-primary dark:text-gray-300 dark:hover:bg-white/5 transition-colors" href="#">
<span class="material-symbols-outlined text-[20px]">style</span>
<p class="text-sm font-medium">Flashcards</p>
</a>
<a class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 hover:bg-gray-50 hover:text-primary dark:text-gray-300 dark:hover:bg-white/5 transition-colors" href="#">
<span class="material-symbols-outlined text-[20px]">group</span>
<p class="text-sm font-medium">Users</p>
</a>
<a class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 hover:bg-gray-50 hover:text-primary dark:text-gray-300 dark:hover:bg-white/5 transition-colors" href="#">
<span class="material-symbols-outlined text-[20px]">bar_chart</span>
<p class="text-sm font-medium">Reports</p>
</a>
<a class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 hover:bg-gray-50 hover:text-primary dark:text-gray-300 dark:hover:bg-white/5 transition-colors" href="#">
<span class="material-symbols-outlined text-[20px]">import_export</span>
<p class="text-sm font-medium">Import / Export</p>
</a>
<a class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 hover:bg-gray-50 hover:text-primary dark:text-gray-300 dark:hover:bg-white/5 transition-colors" href="#">
<span class="material-symbols-outlined text-[20px]">settings</span>
<p class="text-sm font-medium">Settings</p>
</a>
</nav>
</div>
<div class="flex flex-col gap-4 border-t border-gray-100 pt-4 dark:border-white/10">
<div class="flex items-center gap-3 px-2">
<div class="h-9 w-9 rounded-full bg-gray-200 bg-cover bg-center border border-gray-300" style='background-image: url("https://lh3.googleusercontent.com/aida-public/AB6AXuDlj7X3FeByZgwcrzsXQJwePv-4yl8HA3bmTcnNF5lOgngG9vpjm_kyYznzAPZgPVIZ-iMHlmeLbCxxpq7CR0YM-1BmepRG_eeyil5lqU2SlUhs9CHW8_FrpUtQdHmoXzl8DTzoy5_otYgexhRADm4-hnUyPM1rjk5okTceIRQral4XdpNixjnPxWisoyjD-rAs9h-1yU_deBaVQXXGAgGafWOKjyID8Bj0sZqv-7JuPA06AKS6bvqdQNAoiXA1T1tArTvVkGymOOhr");'></div>
<div class="flex flex-col overflow-hidden">
<p class="text-sm font-medium text-gray-900 dark:text-white truncate">System Admin</p>
<p class="text-xs text-gray-500 truncate">Administrator</p>
</div>
</div>
<button class="flex w-full items-center gap-2 justify-center rounded-lg h-9 px-4 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 text-sm font-semibold transition-colors dark:bg-white/5 dark:border-white/10 dark:text-gray-300 dark:hover:bg-white/10">
<span class="material-symbols-outlined text-[18px]">logout</span>
<span>Log Out</span>
</button>
</div>
</div>
</aside>
<main class="flex-1 overflow-y-auto bg-background-light dark:bg-background-dark">
<div class="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-8">
<div class="md:hidden flex items-center justify-between pb-4">
<div class="flex items-center gap-2">
<div class="bg-primary/10 p-1.5 rounded-md">
<span class="material-symbols-outlined text-primary">library_books</span>
</div>
<span class="font-bold text-lg text-primary">Normalite Admin</span>
</div>
<button class="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-white/10">
<span class="material-symbols-outlined">menu</span>
</button>
</div>
<header class="flex flex-col gap-2">
<div class="flex flex-wrap items-end justify-between gap-4">
<div>
<h1 class="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white tracking-tight">Subjects Content Hub</h1>
<p class="text-gray-500 dark:text-gray-400 mt-2 text-base">Manage core subjects, questions, and curriculum organization.</p>
</div>
<div class="flex items-center gap-3">
<div class="relative hidden sm:block">
<span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xl">search</span>
<input class="pl-10 pr-4 py-2 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-sm focus:ring-primary focus:border-primary w-64 transition-all" placeholder="Search subjects..." type="text"/>
</div>
<button class="flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-white hover:bg-primary/90 transition-colors shadow-sm">
<span class="material-symbols-outlined text-[20px]">add</span>
<span class="text-sm font-bold">New Subject</span>
</button>
</div>
</div>
</header>
<div class="flex items-center gap-6 border-b border-gray-200 dark:border-white/10 overflow-x-auto pb-0.5 scrollbar-hide">
<button class="pb-3 px-1 text-sm font-bold text-primary border-b-2 border-primary whitespace-nowrap">All Subjects</button>
<button class="pb-3 px-1 text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 whitespace-nowrap">General Education</button>
<button class="pb-3 px-1 text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 whitespace-nowrap">Professional Education</button>
<button class="pb-3 px-1 text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 whitespace-nowrap">Majorships</button>
</div>
<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
<div class="bg-white dark:bg-[#1a0a0a] rounded-2xl border border-gray-100 dark:border-white/5 overflow-hidden flex flex-col shadow-sm hover:shadow-md transition-shadow group">
<div class="h-32 bg-primary/5 flex items-center justify-center relative overflow-hidden">
<span class="material-symbols-outlined text-6xl text-primary/20 group-hover:scale-110 transition-transform">school</span>
<div class="absolute top-3 right-3">
<span class="bg-primary/10 text-primary text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">Gen Ed</span>
</div>
</div>
<div class="p-5 flex flex-col gap-4 flex-1">
<div>
<h3 class="font-bold text-lg text-gray-900 dark:text-white line-clamp-1">English Proficiency</h3>
<p class="text-xs text-gray-500 dark:text-gray-400 mt-1">Grammar, Literature, and Vocabulary</p>
</div>
<div class="grid grid-cols-2 gap-4 py-3 border-y border-gray-50 dark:border-white/5">
<div class="flex flex-col">
<span class="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Total Questions</span>
<span class="font-bold text-gray-900 dark:text-white text-lg leading-tight">842</span>
</div>
<div class="flex flex-col">
<span class="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Active Exams</span>
<span class="font-bold text-gray-900 dark:text-white text-lg leading-tight">12</span>
</div>
</div>
<div class="flex items-center gap-2 mt-auto">
<button class="flex-1 text-xs font-bold py-2.5 rounded-lg border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">View Details</button>
<button class="w-10 h-10 flex items-center justify-center rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-white transition-colors" title="Add Content">
<span class="material-symbols-outlined text-xl">post_add</span>
</button>
</div>
</div>
</div>
<div class="bg-white dark:bg-[#1a0a0a] rounded-2xl border border-gray-100 dark:border-white/5 overflow-hidden flex flex-col shadow-sm hover:shadow-md transition-shadow group">
<div class="h-32 bg-accent/5 flex items-center justify-center relative overflow-hidden">
<span class="material-symbols-outlined text-6xl text-accent/20 group-hover:scale-110 transition-transform">psychology</span>
<div class="absolute top-3 right-3">
<span class="bg-accent/10 text-accent text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">Prof Ed</span>
</div>
</div>
<div class="p-5 flex flex-col gap-4 flex-1">
<div>
<h3 class="font-bold text-lg text-gray-900 dark:text-white line-clamp-1">Teaching Profession</h3>
<p class="text-xs text-gray-500 dark:text-gray-400 mt-1">Ethics, Foundations &amp; Social Dimensions</p>
</div>
<div class="grid grid-cols-2 gap-4 py-3 border-y border-gray-50 dark:border-white/5">
<div class="flex flex-col">
<span class="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Total Questions</span>
<span class="font-bold text-gray-900 dark:text-white text-lg leading-tight">1,205</span>
</div>
<div class="flex flex-col">
<span class="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Active Exams</span>
<span class="font-bold text-gray-900 dark:text-white text-lg leading-tight">18</span>
</div>
</div>
<div class="flex items-center gap-2 mt-auto">
<button class="flex-1 text-xs font-bold py-2.5 rounded-lg border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">View Details</button>
<button class="w-10 h-10 flex items-center justify-center rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-white transition-colors" title="Add Content">
<span class="material-symbols-outlined text-xl">post_add</span>
</button>
</div>
</div>
</div>
<div class="bg-white dark:bg-[#1a0a0a] rounded-2xl border border-gray-100 dark:border-white/5 overflow-hidden flex flex-col shadow-sm hover:shadow-md transition-shadow group">
<div class="h-32 bg-blue-500/5 flex items-center justify-center relative overflow-hidden">
<span class="material-symbols-outlined text-6xl text-blue-500/20 group-hover:scale-110 transition-transform">calculate</span>
<div class="absolute top-3 right-3">
<span class="bg-blue-100 text-blue-600 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">Gen Ed</span>
</div>
</div>
<div class="p-5 flex flex-col gap-4 flex-1">
<div>
<h3 class="font-bold text-lg text-gray-900 dark:text-white line-clamp-1">Mathematics</h3>
<p class="text-xs text-gray-500 dark:text-gray-400 mt-1">Algebra, Geometry &amp; Statistics</p>
</div>
<div class="grid grid-cols-2 gap-4 py-3 border-y border-gray-50 dark:border-white/5">
<div class="flex flex-col">
<span class="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Total Questions</span>
<span class="font-bold text-gray-900 dark:text-white text-lg leading-tight">612</span>
</div>
<div class="flex flex-col">
<span class="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Active Exams</span>
<span class="font-bold text-gray-900 dark:text-white text-lg leading-tight">8</span>
</div>
</div>
<div class="flex items-center gap-2 mt-auto">
<button class="flex-1 text-xs font-bold py-2.5 rounded-lg border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">View Details</button>
<button class="w-10 h-10 flex items-center justify-center rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-white transition-colors" title="Add Content">
<span class="material-symbols-outlined text-xl">post_add</span>
</button>
</div>
</div>
</div>
<div class="bg-white dark:bg-[#1a0a0a] rounded-2xl border border-gray-100 dark:border-white/5 overflow-hidden flex flex-col shadow-sm hover:shadow-md transition-shadow group">
<div class="h-32 bg-green-500/5 flex items-center justify-center relative overflow-hidden">
<span class="material-symbols-outlined text-6xl text-green-500/20 group-hover:scale-110 transition-transform">science</span>
<div class="absolute top-3 right-3">
<span class="bg-green-100 text-green-600 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">Gen Ed</span>
</div>
</div>
<div class="p-5 flex flex-col gap-4 flex-1">
<div>
<h3 class="font-bold text-lg text-gray-900 dark:text-white line-clamp-1">Natural Sciences</h3>
<p class="text-xs text-gray-500 dark:text-gray-400 mt-1">Biology, Chemistry &amp; Physical Science</p>
</div>
<div class="grid grid-cols-2 gap-4 py-3 border-y border-gray-50 dark:border-white/5">
<div class="flex flex-col">
<span class="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Total Questions</span>
<span class="font-bold text-gray-900 dark:text-white text-lg leading-tight">520</span>
</div>
<div class="flex flex-col">
<span class="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Active Exams</span>
<span class="font-bold text-gray-900 dark:text-white text-lg leading-tight">5</span>
</div>
</div>
<div class="flex items-center gap-2 mt-auto">
<button class="flex-1 text-xs font-bold py-2.5 rounded-lg border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">View Details</button>
<button class="w-10 h-10 flex items-center justify-center rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-white transition-colors" title="Add Content">
<span class="material-symbols-outlined text-xl">post_add</span>
</button>
</div>
</div>
</div>
<div class="bg-white dark:bg-[#1a0a0a] rounded-2xl border border-gray-100 dark:border-white/5 overflow-hidden flex flex-col shadow-sm hover:shadow-md transition-shadow group">
<div class="h-32 bg-purple-500/5 flex items-center justify-center relative overflow-hidden">
<span class="material-symbols-outlined text-6xl text-purple-500/20 group-hover:scale-110 transition-transform">history_edu</span>
<div class="absolute top-3 right-3">
<span class="bg-purple-100 text-purple-600 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">Major</span>
</div>
</div>
<div class="p-5 flex flex-col gap-4 flex-1">
<div>
<h3 class="font-bold text-lg text-gray-900 dark:text-white line-clamp-1">Major: English</h3>
<p class="text-xs text-gray-500 dark:text-gray-400 mt-1">Linguistics and Literature Mastery</p>
</div>
<div class="grid grid-cols-2 gap-4 py-3 border-y border-gray-50 dark:border-white/5">
<div class="flex flex-col">
<span class="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Total Questions</span>
<span class="font-bold text-gray-900 dark:text-white text-lg leading-tight">410</span>
</div>
<div class="flex flex-col">
<span class="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Active Exams</span>
<span class="font-bold text-gray-900 dark:text-white text-lg leading-tight">4</span>
</div>
</div>
<div class="flex items-center gap-2 mt-auto">
<button class="flex-1 text-xs font-bold py-2.5 rounded-lg border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">View Details</button>
<button class="w-10 h-10 flex items-center justify-center rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-white transition-colors" title="Add Content">
<span class="material-symbols-outlined text-xl">post_add</span>
</button>
</div>
</div>
</div>
<div class="bg-white dark:bg-[#1a0a0a] rounded-2xl border border-gray-100 dark:border-white/5 overflow-hidden flex flex-col shadow-sm hover:shadow-md transition-shadow group">
<div class="h-32 bg-orange-500/5 flex items-center justify-center relative overflow-hidden">
<span class="material-symbols-outlined text-6xl text-orange-500/20 group-hover:scale-110 transition-transform">function</span>
<div class="absolute top-3 right-3">
<span class="bg-orange-100 text-orange-600 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">Major</span>
</div>
</div>
<div class="p-5 flex flex-col gap-4 flex-1">
<div>
<h3 class="font-bold text-lg text-gray-900 dark:text-white line-clamp-1">Major: Mathematics</h3>
<p class="text-xs text-gray-500 dark:text-gray-400 mt-1">Advanced Calculus and Analysis</p>
</div>
<div class="grid grid-cols-2 gap-4 py-3 border-y border-gray-50 dark:border-white/5">
<div class="flex flex-col">
<span class="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Total Questions</span>
<span class="font-bold text-gray-900 dark:text-white text-lg leading-tight">385</span>
</div>
<div class="flex flex-col">
<span class="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Active Exams</span>
<span class="font-bold text-gray-900 dark:text-white text-lg leading-tight">3</span>
</div>
</div>
<div class="flex items-center gap-2 mt-auto">
<button class="flex-1 text-xs font-bold py-2.5 rounded-lg border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">View Details</button>
<button class="w-10 h-10 flex items-center justify-center rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-white transition-colors" title="Add Content">
<span class="material-symbols-outlined text-xl">post_add</span>
</button>
</div>
</div>
</div>
<button class="rounded-2xl border-2 border-dashed border-gray-200 dark:border-white/10 flex flex-col items-center justify-center p-8 text-gray-400 hover:text-primary hover:border-primary/50 hover:bg-primary/5 transition-all group">
<span class="material-symbols-outlined text-4xl mb-3">add_circle</span>
<span class="font-bold text-sm">Add New Subject</span>
</button>
</div>
<section class="mt-4">
<div class="flex items-center justify-between mb-4">
<h2 class="text-xl font-bold text-gray-900 dark:text-white">Recent Content Updates</h2>
<a class="text-primary text-sm font-semibold hover:text-primary/80" href="#">Manage Questions Bank</a>
</div>
<div class="bg-white dark:bg-[#1a0a0a] rounded-xl border border-gray-200 dark:border-white/10 overflow-hidden">
<div class="overflow-x-auto">
<table class="w-full text-sm text-left">
<thead class="bg-gray-50 dark:bg-white/5 text-gray-500 uppercase font-medium text-xs">
<tr>
<th class="px-6 py-3">Subject</th>
<th class="px-6 py-3">Activity</th>
<th class="px-6 py-3">By</th>
<th class="px-6 py-3">Timestamp</th>
<th class="px-6 py-3 text-right">Action</th>
</tr>
</thead>
<tbody class="divide-y divide-gray-100 dark:divide-white/5">
<tr class="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
<td class="px-6 py-4">
<div class="flex items-center gap-2">
<div class="w-2 h-2 rounded-full bg-primary"></div>
<span class="font-medium text-gray-900 dark:text-white">English Proficiency</span>
</div>
</td>
<td class="px-6 py-4 text-gray-500">Bulk upload (50 questions)</td>
<td class="px-6 py-4 text-gray-500">Admin_User</td>
<td class="px-6 py-4 text-gray-500">2 hours ago</td>
<td class="px-6 py-4 text-right">
<button class="text-primary hover:underline text-xs font-bold">Review</button>
</td>
</tr>
<tr class="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
<td class="px-6 py-4">
<div class="flex items-center gap-2">
<div class="w-2 h-2 rounded-full bg-accent"></div>
<span class="font-medium text-gray-900 dark:text-white">Teaching Profession</span>
</div>
</td>
<td class="px-6 py-4 text-gray-500">Updated exam metadata</td>
<td class="px-6 py-4 text-gray-500">Mod_Sayson</td>
<td class="px-6 py-4 text-gray-500">5 hours ago</td>
<td class="px-6 py-4 text-right">
<button class="text-primary hover:underline text-xs font-bold">Review</button>
</td>
</tr>
</tbody>
</table>
</div>
</div>
</section>
</div>
</main>
</div>

</body></html>

<!-- Student Performance Dashboard -->
<!DOCTYPE html>
<html class="light" lang="en"><head>
<meta charset="utf-8"/>
<meta content="width=device-width, initial-scale=1.0" name="viewport"/>
<title>Questions Bank - Normalite Reviewer</title>
<link href="https://fonts.googleapis.com" rel="preconnect"/>
<link crossorigin="" href="https://fonts.gstatic.com" rel="preconnect"/>
<link href="https://fonts.googleapis.com/css2?family=Lexend:wght@100..900&amp;family=Noto+Sans:wght@100..900&amp;display=swap" rel="stylesheet"/>
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet"/>
<script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
<script id="tailwind-config">
        tailwind.config = {
            darkMode: "class",
            theme: {
                extend: {
                    colors: {
                        "primary": "#800000",
                        "accent": "#F59E0B",
                        "background-light": "#f8f5f5",
                        "background-dark": "#230f0f",
                    },
                    fontFamily: {
                        "display": ["Lexend", "sans-serif"],
                        "body": ["Noto Sans", "sans-serif"],
                    },
                    borderRadius: {"DEFAULT": "0.375rem", "lg": "0.5rem", "xl": "0.75rem", "2xl": "1rem", "full": "9999px"},
                },
            },
        }
    </script>
<style>
        ::-webkit-scrollbar {
            width: 8px;
            height: 8px;
        }
        ::-webkit-scrollbar-track {
            background: transparent; 
        }
        ::-webkit-scrollbar-thumb {
            background: #d1d5db; 
            border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb:hover {
            background: #9ca3af; 
        }
        .active-nav {
            background-color: rgba(128, 0, 0, 0.1);
            color: #800000;
        }
        .active-nav .material-symbols-outlined {
            font-variation-settings: 'FILL' 1;
        }
    </style>
</head>
<body class="bg-background-light dark:bg-background-dark text-[#1d0c0c] dark:text-white font-display overflow-hidden">
<div class="flex h-screen w-full">
<aside class="flex w-64 flex-col border-r border-[#e5e7eb] bg-white dark:bg-[#1a0a0a] dark:border-[#3a1a1a] transition-all duration-300 hidden md:flex">
<div class="flex h-full flex-col justify-between p-4">
<div class="flex flex-col gap-6">
<div class="flex items-center gap-3 px-2 py-2">
<div class="bg-center bg-no-repeat bg-cover rounded-full h-10 w-10 shadow-sm border border-primary/20" style='background-image: url("https://lh3.googleusercontent.com/aida-public/AB6AXuDRPPNAtErCq7KnUYhj2JsmJNhkhexjuGMyftx05EykHw3q1BlzO-71-JUqsyQSFSiag1qAKfi6bcA9G4HUgLH1lLaFzKMl9DKsXWwXV0LdNJ02QNwnvh0WdIdFpy2zVJg73wjkd-PXjqbBElMEF5bOGlukZ5tUK9GGdjXWh5MWEDuPjDjM55USlSs5AGGZgVZmG8pOwiXYtj1yKgNzA-AvvZAO9x3_VXoFCpwqbuUsTJFM7b4mNxI7kjy_2gqMFqaI0pkK4DcIYkVd");'></div>
<div class="flex flex-col">
<h1 class="text-primary text-lg font-bold leading-tight tracking-tight">Normalite</h1>
<p class="text-gray-500 text-xs font-normal">Admin Portal</p>
</div>
</div>
<nav class="flex flex-col gap-1">
<a class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 hover:bg-gray-50 hover:text-primary dark:text-gray-300 dark:hover:bg-white/5 transition-colors" href="#">
<span class="material-symbols-outlined text-[20px]">dashboard</span>
<p class="text-sm font-medium">Dashboard</p>
</a>
<a class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 hover:bg-gray-50 hover:text-primary dark:text-gray-300 dark:hover:bg-white/5 transition-colors" href="#">
<span class="material-symbols-outlined text-[20px]">library_books</span>
<p class="text-sm font-medium">Subjects</p>
</a>
<a class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 hover:bg-gray-50 hover:text-primary dark:text-gray-300 dark:hover:bg-white/5 transition-colors" href="#">
<span class="material-symbols-outlined text-[20px]">assignment</span>
<p class="text-sm font-medium">Exams</p>
</a>
<a class="flex items-center gap-3 px-3 py-2.5 rounded-lg active-nav" href="#">
<span class="material-symbols-outlined text-[20px]">quiz</span>
<p class="text-sm font-medium">Questions Bank</p>
</a>
<a class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 hover:bg-gray-50 hover:text-primary dark:text-gray-300 dark:hover:bg-white/5 transition-colors" href="#">
<span class="material-symbols-outlined text-[20px]">style</span>
<p class="text-sm font-medium">Flashcards</p>
</a>
<a class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 hover:bg-gray-50 hover:text-primary dark:text-gray-300 dark:hover:bg-white/5 transition-colors" href="#">
<span class="material-symbols-outlined text-[20px]">group</span>
<p class="text-sm font-medium">Users</p>
</a>
<a class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 hover:bg-gray-50 hover:text-primary dark:text-gray-300 dark:hover:bg-white/5 transition-colors" href="#">
<span class="material-symbols-outlined text-[20px]">bar_chart</span>
<p class="text-sm font-medium">Reports</p>
</a>
<a class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 hover:bg-gray-50 hover:text-primary dark:text-gray-300 dark:hover:bg-white/5 transition-colors" href="#">
<span class="material-symbols-outlined text-[20px]">import_export</span>
<p class="text-sm font-medium">Import / Export</p>
</a>
<a class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 hover:bg-gray-50 hover:text-primary dark:text-gray-300 dark:hover:bg-white/5 transition-colors" href="#">
<span class="material-symbols-outlined text-[20px]">settings</span>
<p class="text-sm font-medium">Settings</p>
</a>
</nav>
</div>
<div class="flex flex-col gap-4 border-t border-gray-100 pt-4 dark:border-white/10">
<div class="flex items-center gap-3 px-2">
<div class="h-9 w-9 rounded-full bg-gray-200 bg-cover bg-center border border-gray-300" style='background-image: url("https://lh3.googleusercontent.com/aida-public/AB6AXuDlj7X3FeByZgwcrzsXQJwePv-4yl8HA3bmTcnNF5lOgngG9vpjm_kyYznzAPZgPVIZ-iMHlmeLbCxxpq7CR0YM-1BmepRG_eeyil5lqU2SlUhs9CHW8_FrpUtQdHmoXzl8DTzoy5_otYgexhRADm4-hnUyPM1rjk5okTceIRQral4XdpNixjnPxWisoyjD-rAs9h-1yU_deBaVQXXGAgGafWOKjyID8Bj0sZqv-7JuPA06AKS6bvqdQNAoiXA1T1tArTvVkGymOOhr");'></div>
<div class="flex flex-col overflow-hidden">
<p class="text-sm font-medium text-gray-900 dark:text-white truncate">System Admin</p>
<p class="text-xs text-gray-500 truncate">Administrator</p>
</div>
</div>
<button class="flex w-full items-center gap-2 justify-center rounded-lg h-9 px-4 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 text-sm font-semibold transition-colors dark:bg-white/5 dark:border-white/10 dark:text-gray-300 dark:hover:bg-white/10">
<span class="material-symbols-outlined text-[18px]">logout</span>
<span>Log Out</span>
</button>
</div>
</div>
</aside>
<main class="flex-1 flex flex-col overflow-hidden bg-background-light dark:bg-background-dark">
<header class="bg-white dark:bg-[#1a0a0a] border-b border-[#e5e7eb] dark:border-[#3a1a1a] px-8 py-4 z-10">
<div class="flex items-center justify-between">
<div>
<h2 class="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Question Review Workflow</h2>
<p class="text-sm text-gray-500 dark:text-gray-400">Moderation queue for new submissions and reports.</p>
</div>
<div class="flex items-center gap-3">
<div class="relative">
<input class="w-64 pl-10 pr-4 py-2 text-sm border-gray-200 dark:border-white/10 rounded-lg dark:bg-white/5 dark:text-white focus:ring-primary focus:border-primary" placeholder="Search moderation queue..." type="text"/>
<span class="material-symbols-outlined absolute left-3 top-2.5 text-gray-400 text-[18px]">search</span>
</div>
<button class="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-primary/90 transition-colors shadow-sm">
<span class="material-symbols-outlined text-[20px]">add</span>
                        New Question
                    </button>
</div>
</div>
</header>
<div class="flex-1 flex overflow-hidden">
<section class="w-1/3 min-w-[360px] border-r border-[#e5e7eb] dark:border-[#3a1a1a] flex flex-col bg-white/50 dark:bg-black/10">
<div class="p-4 border-b border-[#e5e7eb] dark:border-[#3a1a1a] flex items-center justify-between bg-white dark:bg-[#1a0a0a]">
<div class="flex gap-2">
<span class="bg-primary/10 text-primary px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider">All (24)</span>
<span class="bg-red-50 text-red-600 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider">Reported (18)</span>
</div>
<button class="text-gray-400 hover:text-gray-600 transition-colors">
<span class="material-symbols-outlined">filter_list</span>
</button>
</div>
<div class="flex-1 overflow-y-auto p-4 space-y-3">
<div class="bg-white dark:bg-[#1a0a0a] p-4 rounded-xl border-2 border-primary shadow-sm cursor-pointer ring-4 ring-primary/5 transition-all">
<div class="flex justify-between items-start mb-2">
<span class="text-[10px] font-bold uppercase tracking-tighter text-red-600 bg-red-50 px-1.5 py-0.5 rounded border border-red-100">Reported</span>
<span class="text-[10px] text-gray-400">2h ago</span>
</div>
<h4 class="text-sm font-bold text-gray-900 dark:text-white line-clamp-2 mb-2">Which of the following describes the 'Law of Exercise' by Thorndike?</h4>
<div class="flex items-center gap-3 text-[11px] text-gray-500">
<span class="flex items-center gap-1 font-medium"><span class="material-symbols-outlined text-[14px]">school</span> Prof Ed</span>
<span class="flex items-center gap-1 font-medium"><span class="material-symbols-outlined text-[14px]">person</span> Faculty_User_01</span>
</div>
</div>
<div class="bg-white dark:bg-[#1a0a0a] p-4 rounded-xl border border-gray-100 dark:border-white/5 shadow-sm cursor-pointer hover:border-primary/30 transition-colors group">
<div class="flex justify-between items-start mb-2">
<span class="text-[10px] font-bold uppercase tracking-tighter text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">New Submission</span>
<span class="text-[10px] text-gray-400">5h ago</span>
</div>
<h4 class="text-sm font-medium text-gray-900 dark:text-white line-clamp-2 mb-2 group-hover:text-primary transition-colors">Identify the correct use of a gerund in the following sentence structures.</h4>
<div class="flex items-center gap-3 text-[11px] text-gray-500">
<span class="flex items-center gap-1"><span class="material-symbols-outlined text-[14px]">translate</span> Gen Ed (English)</span>
<span class="flex items-center gap-1"><span class="material-symbols-outlined text-[14px]">person</span> Student_042</span>
</div>
</div>
<div class="bg-white dark:bg-[#1a0a0a] p-4 rounded-xl border border-gray-100 dark:border-white/5 shadow-sm cursor-pointer hover:border-primary/30 transition-colors group">
<div class="flex justify-between items-start mb-2">
<span class="text-[10px] font-bold uppercase tracking-tighter text-red-600 bg-red-50 px-1.5 py-0.5 rounded border border-red-100">Reported</span>
<span class="text-[10px] text-gray-400">1d ago</span>
</div>
<h4 class="text-sm font-medium text-gray-900 dark:text-white line-clamp-2 mb-2 group-hover:text-primary transition-colors">Solve for X in the following quadratic equation...</h4>
<div class="flex items-center gap-3 text-[11px] text-gray-500">
<span class="flex items-center gap-1"><span class="material-symbols-outlined text-[14px]">functions</span> Majorship (Math)</span>
<span class="flex items-center gap-1"><span class="material-symbols-outlined text-[14px]">person</span> System_Audit</span>
</div>
</div>
</div>
</section>
<section class="flex-1 flex flex-col overflow-y-auto p-8">
<div class="max-w-4xl mx-auto w-full space-y-8">
<div class="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-4">
<div class="bg-red-100 p-2 rounded-lg text-red-700">
<span class="material-symbols-outlined">warning</span>
</div>
<div>
<p class="font-bold text-red-900 text-sm">Reason for Report: Incorrect Answer Key</p>
<p class="text-red-800 text-sm mt-0.5">User <strong>@juan_delacruz</strong> reported: "The correct answer should be Option B based on recent DepEd guidelines, but the system marks D as correct."</p>
</div>
</div>
<div class="flex flex-col gap-6">
<div class="flex items-center justify-between">
<h3 class="text-2xl font-bold text-gray-900 dark:text-white">Question Details</h3>
<div class="flex items-center gap-2">
<span class="bg-white border border-gray-200 dark:bg-white/10 dark:border-transparent px-3 py-1 rounded-full text-[11px] font-bold text-gray-600 dark:text-gray-300 uppercase">ID: #Q-9942</span>
<span class="bg-accent/10 text-accent border border-accent/20 px-3 py-1 rounded-full text-[11px] font-bold uppercase">Level: Advanced</span>
</div>
</div>
<div class="bg-white dark:bg-[#1a0a0a] rounded-2xl p-8 border border-gray-100 dark:border-white/5 shadow-sm space-y-6">
<div class="space-y-2">
<label class="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
<span class="material-symbols-outlined text-sm">subject</span> Question Text
                                </label>
<p class="text-lg leading-relaxed font-semibold text-gray-900 dark:text-white">
                                    Which of the following describes the 'Law of Exercise' by Thorndike?
                                </p>
</div>
<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
<div class="p-4 rounded-xl border border-gray-200 dark:border-white/10 flex items-center gap-3 bg-gray-50/30">
<div class="h-8 w-8 shrink-0 rounded-full bg-white border border-gray-200 flex items-center justify-center font-bold text-gray-400">A</div>
<p class="text-sm">Connection between S and R is strengthened when the consequence is positive.</p>
</div>
<div class="p-4 rounded-xl border-2 border-green-500 bg-green-50/50 flex items-center gap-3 relative">
<div class="h-8 w-8 shrink-0 rounded-full bg-green-500 flex items-center justify-center font-bold text-white text-sm">B</div>
<p class="text-sm font-bold text-green-900">The more often a response is repeated, the more it is strengthened.</p>
<span class="absolute -top-2 -right-2 bg-green-600 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full shadow-sm">Correct Answer</span>
</div>
<div class="p-4 rounded-xl border border-gray-200 dark:border-white/10 flex items-center gap-3 bg-gray-50/30">
<div class="h-8 w-8 shrink-0 rounded-full bg-white border border-gray-200 flex items-center justify-center font-bold text-gray-400">C</div>
<p class="text-sm">Learning is most effective when the learner is ready to learn.</p>
</div>
<div class="p-4 rounded-xl border-2 border-primary/40 bg-primary/5 flex items-center gap-3 relative">
<div class="h-8 w-8 shrink-0 rounded-full bg-primary/20 flex items-center justify-center font-bold text-primary text-sm">D</div>
<p class="text-sm font-semibold text-primary/80 italic">Connections are weakened when the response is not practiced.</p>
<span class="absolute -top-2 -right-2 bg-primary text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full shadow-sm uppercase tracking-tighter">Reported</span>
</div>
</div>
<div class="pt-6 border-t border-gray-100 dark:border-white/5">
<label class="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 block">Explanation / Rationale</label>
<div class="bg-gray-50 dark:bg-white/5 p-4 rounded-xl italic text-sm text-gray-700 dark:text-gray-300 border-l-4 border-accent">
                                    The Law of Exercise states that those things most often repeated are best remembered. It is the basis of drill and practice.
                                </div>
</div>
</div>
<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
<div class="bg-white dark:bg-[#1a0a0a] p-5 rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm transition-transform hover:scale-[1.02]">
<p class="text-[10px] font-extrabold text-primary uppercase tracking-[0.15em] mb-1 opacity-80">Category</p>
<div class="flex items-center gap-2">
<span class="material-symbols-outlined text-primary text-lg">school</span>
<p class="font-bold text-gray-900 dark:text-white text-base">Professional Education</p>
</div>
</div>
<div class="bg-white dark:bg-[#1a0a0a] p-5 rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm transition-transform hover:scale-[1.02]">
<p class="text-[10px] font-extrabold text-accent uppercase tracking-[0.15em] mb-1 opacity-80">Subject</p>
<div class="flex items-center gap-2">
<span class="material-symbols-outlined text-accent text-lg">menu_book</span>
<p class="font-bold text-gray-900 dark:text-white text-base">Theories of Learning</p>
</div>
</div>
<div class="bg-white dark:bg-[#1a0a0a] p-5 rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm transition-transform hover:scale-[1.02]">
<p class="text-[10px] font-extrabold text-gray-400 uppercase tracking-[0.15em] mb-1">Topic</p>
<div class="flex items-center gap-2">
<span class="material-symbols-outlined text-gray-400 text-lg">label</span>
<p class="font-bold text-gray-800 dark:text-gray-200 text-sm">Law of Exercise</p>
</div>
</div>
<div class="bg-white dark:bg-[#1a0a0a] p-5 rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm transition-transform hover:scale-[1.02]">
<p class="text-[10px] font-extrabold text-gray-400 uppercase tracking-[0.15em] mb-1">Contributor</p>
<div class="flex items-center gap-2">
<div class="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
<span class="material-symbols-outlined text-primary text-sm">person</span>
</div>
<p class="font-bold text-gray-800 dark:text-gray-200 text-sm">Faculty_User_01</p>
</div>
</div>
</div>
<div class="bg-white dark:bg-[#1a0a0a] rounded-2xl p-6 border border-primary/20 shadow-lg ring-1 ring-primary/10">
<div class="flex items-center gap-2 mb-6 text-primary">
<span class="material-symbols-outlined">gavel</span>
<h3 class="text-lg font-bold tracking-tight">Review &amp; Take Action</h3>
</div>
<div class="flex flex-col sm:flex-row gap-4">
<button class="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-3.5 px-6 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md shadow-green-100 active:scale-95">
<span class="material-symbols-outlined">check_circle</span>
                                    Approve &amp; Publish
                                </button>
<button class="flex-1 bg-white dark:bg-white/5 border-2 border-gray-200 dark:border-white/10 text-gray-700 dark:text-white font-bold py-3.5 px-6 rounded-xl flex items-center justify-center gap-2 hover:bg-gray-50 dark:hover:bg-white/10 transition-all active:scale-95">
<span class="material-symbols-outlined">edit</span>
                                    Edit Content
                                </button>
<button class="flex-1 bg-red-50 text-red-600 border border-red-200 font-bold py-3.5 px-6 rounded-xl flex items-center justify-center gap-2 hover:bg-red-100 transition-all active:scale-95">
<span class="material-symbols-outlined">flag</span>
                                    Keep Flagged
                                </button>
</div>
<div class="mt-6">
<label class="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-2">Moderator Note (Optional)</label>
<textarea class="w-full rounded-xl border-gray-200 dark:border-white/10 dark:bg-white/5 focus:ring-primary focus:border-primary text-sm p-4" placeholder="Add internal notes about this decision..." rows="3"></textarea>
</div>
</div>
<div class="h-16"></div>
</div>
</div>
</section>
</div>
</main>
</div>

</body></html>

<!-- Student Performance Dashboard -->
<!DOCTYPE html>
<html class="light" lang="en"><head>
<meta charset="utf-8"/>
<meta content="width=device-width, initial-scale=1.0" name="viewport"/>
<title>Subject Details - Normalite Reviewer</title>
<link href="https://fonts.googleapis.com" rel="preconnect"/>
<link crossorigin="" href="https://fonts.gstatic.com" rel="preconnect"/>
<link href="https://fonts.googleapis.com/css2?family=Lexend:wght@100..900&amp;family=Noto+Sans:wght@100..900&amp;display=swap" rel="stylesheet"/>
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet"/>
<script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
<script id="tailwind-config">
        tailwind.config = {
            darkMode: "class",
            theme: {
                extend: {
                    colors: {
                        "primary": "#800000",
                        "accent": "#F59E0B",
                        "background-light": "#f8f5f5",
                        "background-dark": "#230f0f",
                    },
                    fontFamily: {
                        "display": ["Lexend", "sans-serif"],
                        "body": ["Noto Sans", "sans-serif"],
                    },
                    borderRadius: {"DEFAULT": "0.375rem", "lg": "0.5rem", "xl": "0.75rem", "2xl": "1rem", "full": "9999px"},
                },
            },
        }
    </script>
<style>
        ::-webkit-scrollbar {
            width: 8px;
            height: 8px;
        }
        ::-webkit-scrollbar-track {
            background: transparent; 
        }
        ::-webkit-scrollbar-thumb {
            background: #d1d5db; 
            border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb:hover {
            background: #9ca3af; 
        }
        .hide-scrollbar::-webkit-scrollbar {
            display: none;
        }
    </style>
</head>
<body class="bg-background-light dark:bg-background-dark text-[#1d0c0c] dark:text-white font-display overflow-hidden">
<div class="flex h-screen w-full">
<aside class="flex w-64 flex-col border-r border-[#e5e7eb] bg-white dark:bg-[#1a0a0a] dark:border-[#3a1a1a] transition-all duration-300 hidden md:flex">
<div class="flex h-full flex-col justify-between p-4">
<div class="flex flex-col gap-6">
<div class="flex items-center gap-3 px-2 py-2">
<div class="bg-center bg-no-repeat bg-cover rounded-full h-10 w-10 shadow-sm border border-primary/20" style='background-image: url("https://lh3.googleusercontent.com/aida-public/AB6AXuDRPPNAtErCq7KnUYhj2JsmJNhkhexjuGMyftx05EykHw3q1BlzO-71-JUqsyQSFSiag1qAKfi6bcA9G4HUgLH1lLaFzKMl9DKsXWwXV0LdNJ02QNwnvh0WdIdFpy2zVJg73wjkd-PXjqbBElMEF5bOGlukZ5tUK9GGdjXWh5MWEDuPjDjM55USlSs5AGGZgVZmG8pOwiXYtj1yKgNzA-AvvZAO9x3_VXoFCpwqbuUsTJFM7b4mNxI7kjy_2gqMFqaI0pkK4DcIYkVd");'></div>
<div class="flex flex-col">
<h1 class="text-primary text-lg font-bold leading-tight tracking-tight">Normalite</h1>
<p class="text-gray-500 text-xs font-normal">Admin Portal</p>
</div>
</div>
<nav class="flex flex-col gap-1">
<a class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 hover:bg-gray-50 hover:text-primary dark:text-gray-300 dark:hover:bg-white/5 transition-colors" href="#">
<span class="material-symbols-outlined text-[20px]">dashboard</span>
<p class="text-sm font-medium">Dashboard</p>
</a>
<a class="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-primary/10 text-primary group transition-colors" href="#">
<span class="material-symbols-outlined text-[20px] font-variation-settings-'FILL'1">library_books</span>
<p class="text-sm font-medium">Subjects</p>
</a>
<a class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 hover:bg-gray-50 hover:text-primary dark:text-gray-300 dark:hover:bg-white/5 transition-colors" href="#">
<span class="material-symbols-outlined text-[20px]">assignment</span>
<p class="text-sm font-medium">Exams</p>
</a>
<a class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 hover:bg-gray-50 hover:text-primary dark:text-gray-300 dark:hover:bg-white/5 transition-colors" href="#">
<span class="material-symbols-outlined text-[20px]">quiz</span>
<p class="text-sm font-medium">Questions Bank</p>
</a>
<a class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 hover:bg-gray-50 hover:text-primary dark:text-gray-300 dark:hover:bg-white/5 transition-colors" href="#">
<span class="material-symbols-outlined text-[20px]">style</span>
<p class="text-sm font-medium">Flashcards</p>
</a>
<a class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 hover:bg-gray-50 hover:text-primary dark:text-gray-300 dark:hover:bg-white/5 transition-colors" href="#">
<span class="material-symbols-outlined text-[20px]">group</span>
<p class="text-sm font-medium">Users</p>
</a>
</nav>
</div>
<div class="flex flex-col gap-4 border-t border-gray-100 pt-4 dark:border-white/10">
<div class="flex items-center gap-3 px-2">
<div class="h-9 w-9 rounded-full bg-gray-200 bg-cover bg-center border border-gray-300" style='background-image: url("https://lh3.googleusercontent.com/aida-public/AB6AXuDlj7X3FeByZgwcrzsXQJwePv-4yl8HA3bmTcnNF5lOgngG9vpjm_kyYznzAPZgPVIZ-iMHlmeLbCxxpq7CR0YM-1BmepRG_eeyil5lqU2SlUhs9CHW8_FrpUtQdHmoXzl8DTzoy5_otYgexhRADm4-hnUyPM1rjk5okTceIRQral4XdpNixjnPxWisoyjD-rAs9h-1yU_deBaVQXXGAgGafWOKjyID8Bj0sZqv-7JuPA06AKS6bvqdQNAoiXA1T1tArTvVkGymOOhr");'></div>
<div class="flex flex-col overflow-hidden">
<p class="text-sm font-medium text-gray-900 dark:text-white truncate">System Admin</p>
<p class="text-xs text-gray-500 truncate">Administrator</p>
</div>
</div>
<button class="flex w-full items-center gap-2 justify-center rounded-lg h-9 px-4 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 text-sm font-semibold transition-colors dark:bg-white/5 dark:border-white/10 dark:text-gray-300 dark:hover:bg-white/10">
<span class="material-symbols-outlined text-[18px]">logout</span>
<span>Log Out</span>
</button>
</div>
</div>
</aside>
<main class="flex-1 overflow-y-auto bg-background-light dark:bg-background-dark">
<div class="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-6">
<nav class="flex items-center gap-2 text-sm text-gray-500 mb-2">
<a class="hover:text-primary flex items-center gap-1" href="#">
<span class="material-symbols-outlined text-base">home</span>
                    Subjects
                </a>
<span class="material-symbols-outlined text-sm">chevron_right</span>
<span class="font-semibold text-gray-900 dark:text-white">Teaching Profession</span>
</nav>
<header class="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white dark:bg-[#1a0a0a] p-6 rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm">
<div class="flex items-center gap-5">
<div class="h-16 w-16 bg-accent/10 flex items-center justify-center rounded-2xl text-accent">
<span class="material-symbols-outlined text-4xl">psychology</span>
</div>
<div>
<div class="flex items-center gap-2">
<h1 class="text-2xl font-bold text-gray-900 dark:text-white">Teaching Profession</h1>
<span class="bg-accent/10 text-accent text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">Prof Ed</span>
</div>
<p class="text-gray-500 dark:text-gray-400 mt-1">Foundations of education, professional ethics, and social dimensions of teaching.</p>
</div>
</div>
<div class="flex items-center gap-3">
<button class="flex h-10 items-center gap-2 rounded-lg border border-gray-200 dark:border-white/10 px-4 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
<span class="material-symbols-outlined text-[20px]">edit</span>
<span class="text-sm font-bold">Edit Subject</span>
</button>
<button class="flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-white hover:bg-primary/90 transition-colors shadow-sm">
<span class="material-symbols-outlined text-[20px]">add</span>
<span class="text-sm font-bold">Add Question</span>
</button>
</div>
</header>
<div class="grid grid-cols-2 md:grid-cols-4 gap-4">
<div class="bg-white dark:bg-[#1a0a0a] p-4 rounded-xl border border-gray-100 dark:border-white/5 flex flex-col gap-1">
<span class="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Total Questions</span>
<span class="text-2xl font-bold text-gray-900 dark:text-white">1,205</span>
<div class="flex items-center gap-1 text-[10px] text-green-600 font-medium">
<span class="material-symbols-outlined text-xs">trending_up</span>
<span>+24 this week</span>
</div>
</div>
<div class="bg-white dark:bg-[#1a0a0a] p-4 rounded-xl border border-gray-100 dark:border-white/5 flex flex-col gap-1">
<span class="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Active Exams</span>
<span class="text-2xl font-bold text-gray-900 dark:text-white">18</span>
<div class="flex items-center gap-1 text-[10px] text-blue-600 font-medium">
<span class="material-symbols-outlined text-xs">info</span>
<span>3 ending soon</span>
</div>
</div>
<div class="bg-white dark:bg-[#1a0a0a] p-4 rounded-xl border border-gray-100 dark:border-white/5 flex flex-col gap-1">
<span class="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Flashcard Decks</span>
<span class="text-2xl font-bold text-gray-900 dark:text-white">12</span>
<div class="flex items-center gap-1 text-[10px] text-gray-500 font-medium">
<span class="material-symbols-outlined text-xs">visibility</span>
<span>8.2k total views</span>
</div>
</div>
<div class="bg-white dark:bg-[#1a0a0a] p-4 rounded-xl border border-gray-100 dark:border-white/5 flex flex-col gap-1">
<span class="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Average Difficulty</span>
<span class="text-2xl font-bold text-gray-900 dark:text-white">Medium</span>
<div class="flex items-center gap-1 text-[10px] text-accent font-medium">
<span class="material-symbols-outlined text-xs">bolt</span>
<span>LEPT Standard</span>
</div>
</div>
</div>
<div class="flex flex-col gap-4">
<div class="flex items-center gap-1 border-b border-gray-200 dark:border-white/10 overflow-x-auto hide-scrollbar">
<button class="pb-3 px-6 text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 whitespace-nowrap">Overview</button>
<button class="pb-3 px-6 text-sm font-bold text-primary border-b-2 border-primary whitespace-nowrap flex items-center gap-2">
                        Questions 
                        <span class="bg-primary/10 px-1.5 py-0.5 rounded text-[10px]">1,205</span>
</button>
<button class="pb-3 px-6 text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 whitespace-nowrap flex items-center gap-2">
                        Exams
                        <span class="bg-gray-100 dark:bg-white/5 px-1.5 py-0.5 rounded text-[10px]">18</span>
</button>
<button class="pb-3 px-6 text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 whitespace-nowrap flex items-center gap-2">
                        Flashcards
                        <span class="bg-gray-100 dark:bg-white/5 px-1.5 py-0.5 rounded text-[10px]">12</span>
</button>
<button class="pb-3 px-6 text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 whitespace-nowrap">Analytics</button>
</div>
<div class="flex flex-col gap-4">
<div class="flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-[#1a0a0a] p-4 rounded-xl border border-gray-100 dark:border-white/5">
<div class="flex flex-1 min-w-[240px] relative">
<span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xl">search</span>
<input class="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-white/5 border-none rounded-lg text-sm focus:ring-1 focus:ring-primary transition-all" placeholder="Search questions by text or ID..." type="text"/>
</div>
<div class="flex items-center gap-3">
<select class="bg-gray-50 dark:bg-white/5 border-none rounded-lg text-sm py-2 px-4 focus:ring-1 focus:ring-primary cursor-pointer text-gray-600 dark:text-gray-300">
<option>Difficulty: All</option>
<option>Easy</option>
<option>Medium</option>
<option>Hard</option>
</select>
<select class="bg-gray-50 dark:bg-white/5 border-none rounded-lg text-sm py-2 px-4 focus:ring-1 focus:ring-primary cursor-pointer text-gray-600 dark:text-gray-300">
<option>Type: Multiple Choice</option>
<option>True/False</option>
<option>Matching</option>
</select>
<button class="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 rounded-lg border border-gray-200 dark:border-white/10 transition-colors">
<span class="material-symbols-outlined text-[18px]">filter_list</span>
                                More Filters
                            </button>
</div>
</div>
<div class="bg-white dark:bg-[#1a0a0a] rounded-xl border border-gray-200 dark:border-white/10 overflow-hidden shadow-sm">
<div class="overflow-x-auto">
<table class="w-full text-sm text-left border-collapse">
<thead class="bg-gray-50 dark:bg-white/5 border-b border-gray-100 dark:border-white/5 text-gray-500 uppercase font-bold text-[10px] tracking-widest">
<tr>
<th class="px-6 py-4 w-12 text-center">ID</th>
<th class="px-6 py-4">Question Content</th>
<th class="px-6 py-4 text-center">Level</th>
<th class="px-6 py-4">Topic</th>
<th class="px-6 py-4 text-center">Correct Rate</th>
<th class="px-6 py-4 text-right">Actions</th>
</tr>
</thead>
<tbody class="divide-y divide-gray-100 dark:divide-white/5">
<tr class="hover:bg-gray-50/50 dark:hover:bg-white/5 transition-colors group">
<td class="px-6 py-4 text-center text-gray-400 font-medium">#Q-104</td>
<td class="px-6 py-4 max-w-md">
<div class="flex flex-col gap-1">
<p class="text-gray-900 dark:text-white font-medium line-clamp-2">Which of the following describes the 'Teacher as a Facilitator' according to the Philippine Professional Standards for Teachers?</p>
<div class="flex items-center gap-3">
<span class="text-[10px] bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 px-1.5 py-0.5 rounded font-bold uppercase">Multiple Choice</span>
</div>
</div>
</td>
<td class="px-6 py-4 text-center">
<span class="px-2 py-1 rounded-full text-[11px] font-bold bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400">Easy</span>
</td>
<td class="px-6 py-4">
<span class="text-gray-600 dark:text-gray-400">Professionalism</span>
</td>
<td class="px-6 py-4 text-center">
<div class="flex flex-col gap-1 items-center">
<span class="font-bold text-gray-900 dark:text-white">82%</span>
<div class="w-16 bg-gray-100 dark:bg-white/10 rounded-full h-1 overflow-hidden">
<div class="bg-green-500 h-full" style="width: 82%"></div>
</div>
</div>
</td>
<td class="px-6 py-4 text-right">
<div class="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
<button class="p-1.5 rounded-lg hover:bg-primary/10 hover:text-primary transition-colors text-gray-400" title="Edit">
<span class="material-symbols-outlined text-[20px]">edit</span>
</button>
<button class="p-1.5 rounded-lg hover:bg-blue-100 hover:text-blue-600 dark:hover:bg-blue-900/30 transition-colors text-gray-400" title="Preview">
<span class="material-symbols-outlined text-[20px]">visibility</span>
</button>
<button class="p-1.5 rounded-lg hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30 transition-colors text-gray-400" title="Delete">
<span class="material-symbols-outlined text-[20px]">delete</span>
</button>
</div>
</td>
</tr>
<tr class="hover:bg-gray-50/50 dark:hover:bg-white/5 transition-colors group">
<td class="px-6 py-4 text-center text-gray-400 font-medium">#Q-218</td>
<td class="px-6 py-4 max-w-md">
<div class="flex flex-col gap-1">
<p class="text-gray-900 dark:text-white font-medium line-clamp-2">The Code of Ethics for Professional Teachers covers all public and private school teachers in all educational institutions at the preschool, primary, elementary, and secondary levels.</p>
<div class="flex items-center gap-3">
<span class="text-[10px] bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 px-1.5 py-0.5 rounded font-bold uppercase">True/False</span>
</div>
</div>
</td>
<td class="px-6 py-4 text-center">
<span class="px-2 py-1 rounded-full text-[11px] font-bold bg-accent/10 text-accent">Medium</span>
</td>
<td class="px-6 py-4">
<span class="text-gray-600 dark:text-gray-400">Legal Bases</span>
</td>
<td class="px-6 py-4 text-center">
<div class="flex flex-col gap-1 items-center">
<span class="font-bold text-gray-900 dark:text-white">64%</span>
<div class="w-16 bg-gray-100 dark:bg-white/10 rounded-full h-1 overflow-hidden">
<div class="bg-accent h-full" style="width: 64%"></div>
</div>
</div>
</td>
<td class="px-6 py-4 text-right">
<div class="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
<button class="p-1.5 rounded-lg hover:bg-primary/10 hover:text-primary transition-colors text-gray-400" title="Edit">
<span class="material-symbols-outlined text-[20px]">edit</span>
</button>
<button class="p-1.5 rounded-lg hover:bg-blue-100 hover:text-blue-600 dark:hover:bg-blue-900/30 transition-colors text-gray-400" title="Preview">
<span class="material-symbols-outlined text-[20px]">visibility</span>
</button>
<button class="p-1.5 rounded-lg hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30 transition-colors text-gray-400" title="Delete">
<span class="material-symbols-outlined text-[20px]">delete</span>
</button>
</div>
</td>
</tr>
<tr class="hover:bg-gray-50/50 dark:hover:bg-white/5 transition-colors group">
<td class="px-6 py-4 text-center text-gray-400 font-medium">#Q-052</td>
<td class="px-6 py-4 max-w-md">
<div class="flex flex-col gap-1">
<p class="text-gray-900 dark:text-white font-medium line-clamp-2">Explain the concept of 'Pedagogical Content Knowledge' (PCK) and how it differentiates a teacher from a subject matter expert.</p>
<div class="flex items-center gap-3">
<span class="text-[10px] bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 px-1.5 py-0.5 rounded font-bold uppercase">Short Answer</span>
</div>
</div>
</td>
<td class="px-6 py-4 text-center">
<span class="px-2 py-1 rounded-full text-[11px] font-bold bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400">Hard</span>
</td>
<td class="px-6 py-4">
<span class="text-gray-600 dark:text-gray-400">Teaching Strategies</span>
</td>
<td class="px-6 py-4 text-center">
<div class="flex flex-col gap-1 items-center">
<span class="font-bold text-gray-900 dark:text-white">42%</span>
<div class="w-16 bg-gray-100 dark:bg-white/10 rounded-full h-1 overflow-hidden">
<div class="bg-red-500 h-full" style="width: 42%"></div>
</div>
</div>
</td>
<td class="px-6 py-4 text-right">
<div class="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
<button class="p-1.5 rounded-lg hover:bg-primary/10 hover:text-primary transition-colors text-gray-400" title="Edit">
<span class="material-symbols-outlined text-[20px]">edit</span>
</button>
<button class="p-1.5 rounded-lg hover:bg-blue-100 hover:text-blue-600 dark:hover:bg-blue-900/30 transition-colors text-gray-400" title="Preview">
<span class="material-symbols-outlined text-[20px]">visibility</span>
</button>
<button class="p-1.5 rounded-lg hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30 transition-colors text-gray-400" title="Delete">
<span class="material-symbols-outlined text-[20px]">delete</span>
</button>
</div>
</td>
</tr>
</tbody>
</table>
</div>
<div class="px-6 py-4 border-t border-gray-100 dark:border-white/5 flex items-center justify-between">
<p class="text-xs text-gray-500">Showing <span class="font-bold">1-10</span> of <span class="font-bold">1,205</span> questions</p>
<div class="flex items-center gap-2">
<button class="p-1.5 rounded-lg border border-gray-200 dark:border-white/10 text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 disabled:opacity-50" disabled="">
<span class="material-symbols-outlined text-[18px]">chevron_left</span>
</button>
<button class="h-8 w-8 rounded-lg bg-primary text-white text-xs font-bold">1</button>
<button class="h-8 w-8 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 text-xs font-bold">2</button>
<button class="h-8 w-8 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 text-xs font-bold">3</button>
<span class="text-gray-400 px-1">...</span>
<button class="h-8 w-8 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 text-xs font-bold">121</button>
<button class="p-1.5 rounded-lg border border-gray-200 dark:border-white/10 text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5">
<span class="material-symbols-outlined text-[18px]">chevron_right</span>
</button>
</div>
</div>
</div>
</div>
</div>
<section class="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
<div class="bg-primary/5 dark:bg-primary/10 p-6 rounded-2xl border border-primary/10 flex items-start gap-4">
<div class="h-12 w-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary shrink-0">
<span class="material-symbols-outlined text-2xl">publish</span>
</div>
<div>
<h3 class="font-bold text-gray-900 dark:text-white">Bulk Management</h3>
<p class="text-sm text-gray-600 dark:text-gray-400 mt-1">Need to update multiple questions at once? Use our bulk import/export tool to manage large datasets via CSV or Excel.</p>
<button class="mt-3 text-sm font-bold text-primary hover:underline">Import Questions</button>
</div>
</div>
<div class="bg-accent/5 p-6 rounded-2xl border border-accent/10 flex items-start gap-4">
<div class="h-12 w-12 bg-accent/10 rounded-xl flex items-center justify-center text-accent shrink-0">
<span class="material-symbols-outlined text-2xl">auto_awesome</span>
</div>
<div>
<h3 class="font-bold text-gray-900 dark:text-white">Quality Check</h3>
<p class="text-sm text-gray-600 dark:text-gray-400 mt-1">There are 14 questions flagged for review due to low student performance or reported errors.</p>
<button class="mt-3 text-sm font-bold text-accent hover:underline">Review Flagged Items</button>
</div>
</div>
</section>
</div>
</main>
</div>

</body></html>