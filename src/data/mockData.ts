export type Chapter = {
  id: string;
  name: string;
};

export type Subject = {
  id: string;
  name: string;
  chapters: Chapter[];
};

export type Exam = {
  id: string;
  name: string;
  subjects: Subject[];
};

export const mockExams: Exam[] = [
  {
    id: "jee",
    name: "JEE",
    subjects: [
      {
        id: "physics",
        name: "Physics",
        chapters: [
          { id: "mechanics", name: "Mechanics" },
          { id: "electromagnetism", name: "Electromagnetism" },
          { id: "optics", name: "Optics" },
          { id: "thermodynamics", name: "Thermodynamics" },
          { id: "modern-physics", name: "Modern Physics" },
        ],
      },
      {
        id: "chemistry",
        name: "Chemistry",
        chapters: [
          { id: "physical-chemistry", name: "Physical Chemistry" },
          { id: "organic-chemistry", name: "Organic Chemistry" },
          { id: "inorganic-chemistry", name: "Inorganic Chemistry" },
          { id: "atomic-structure", name: "Atomic Structure" },
          { id: "chemical-bonding", name: "Chemical Bonding" },
        ],
      },
      {
        id: "mathematics",
        name: "Mathematics",
        chapters: [
          { id: "calculus", name: "Calculus" },
          { id: "algebra", name: "Algebra" },
          { id: "coordinate-geometry", name: "Coordinate Geometry" },
          { id: "trigonometry", name: "Trigonometry" },
          { id: "vectors-and-3d", name: "Vectors and 3D Geometry" },
        ],
      },
    ],
  },
  {
    id: "neet",
    name: "NEET",
    subjects: [
      {
        id: "physics",
        name: "Physics",
        chapters: [
          { id: "kinematics", name: "Kinematics" },
          { id: "laws-of-motion", name: "Laws of Motion" },
          { id: "work-energy-power", name: "Work, Energy and Power" },
          { id: "rotational-motion", name: "Rotational Motion" },
          { id: "gravitation", name: "Gravitation" },
        ],
      },
      {
        id: "chemistry",
        name: "Chemistry",
        chapters: [
          { id: "some-basic-concepts", name: "Some Basic Concepts of Chemistry" },
          { id: "structure-of-atom", name: "Structure of Atom" },
          { id: "classification-of-elements", name: "Classification of Elements" },
          { id: "chemical-bonding", name: "Chemical Bonding" },
          { id: "states-of-matter", name: "States of Matter" },
        ],
      },
      {
        id: "biology",
        name: "Biology",
        chapters: [
          { id: "diversity-in-living-world", name: "Diversity in Living World" },
          { id: "structural-organization", name: "Structural Organization in Animals and Plants" },
          { id: "cell-structure-and-function", name: "Cell Structure and Function" },
          { id: "plant-physiology", name: "Plant Physiology" },
          { id: "human-physiology", name: "Human Physiology" },
        ],
      },
    ],
  },
  {
    id: "upsc",
    name: "UPSC",
    subjects: [
      {
        id: "history",
        name: "History",
        chapters: [
          { id: "ancient-india", name: "Ancient India" },
          { id: "medieval-india", name: "Medieval India" },
          { id: "modern-india", name: "Modern India" },
          { id: "indian-national-movement", name: "Indian National Movement" },
          { id: "world-history", name: "World History" },
        ],
      },
      {
        id: "geography",
        name: "Geography",
        chapters: [
          { id: "physical-geography", name: "Physical Geography" },
          { id: "indian-geography", name: "Indian Geography" },
          { id: "world-geography", name: "World Geography" },
          { id: "human-geography", name: "Human Geography" },
          { id: "economic-geography", name: "Economic Geography" },
        ],
      },
      {
        id: "polity",
        name: "Polity",
        chapters: [
          { id: "constitution-of-india", name: "Constitution of India" },
          { id: "political-system", name: "Political System" },
          { id: "panchayati-raj", name: "Panchayati Raj" },
          { id: "public-policy", name: "Public Policy" },
          { id: "rights-issues", name: "Rights Issues" },
        ],
      },
      {
        id: "economy",
        name: "Economy",
        chapters: [
          { id: "economic-growth-and-development", name: "Economic Growth and Development" },
          { id: "poverty", name: "Poverty" },
          { id: "inclusion", name: "Inclusion" },
          { id: "demographics", name: "Demographics" },
          { id: "social-sector-initiatives", name: "Social Sector Initiatives" },
        ],
      },
    ],
  },
  {
    id: "gate",
    name: "GATE",
    subjects: [
      {
        id: "computer-science",
        name: "Computer Science",
        chapters: [
          { id: "data-structures", name: "Data Structures" },
          { id: "algorithms", name: "Algorithms" },
          { id: "operating-systems", name: "Operating Systems" },
          { id: "dbms", name: "DBMS" },
          { id: "computer-networks", name: "Computer Networks" },
        ],
      },
      {
        id: "electrical",
        name: "Electrical",
        chapters: [
          { id: "electric-circuits", name: "Electric Circuits" },
          { id: "electromagnetic-fields", name: "Electromagnetic Fields" },
          { id: "signals-and-systems", name: "Signals and Systems" },
          { id: "electrical-machines", name: "Electrical Machines" },
          { id: "power-systems", name: "Power Systems" },
        ],
      },
      {
        id: "mechanical",
        name: "Mechanical",
        chapters: [
          { id: "engineering-mechanics", name: "Engineering Mechanics" },
          { id: "mechanics-of-materials", name: "Mechanics of Materials" },
          { id: "theory-of-machines", name: "Theory of Machines" },
          { id: "vibrations", name: "Vibrations" },
          { id: "thermodynamics", name: "Thermodynamics" },
        ],
      },
    ],
  },
];
